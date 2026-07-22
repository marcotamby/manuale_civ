-- Fix per la funzione RPC settle_betting_market per gestire correttamente vincitori con scommesse multiple nello stesso mercato
CREATE OR REPLACE FUNCTION settle_betting_market(p_market_id UUID, p_winner_option_id TEXT)
RETURNS void AS $$
DECLARE
    v_total_real_bets BIGINT;
    v_winning_real_bets BIGINT;
    v_total_initial_weights BIGINT := 0;
    v_winning_initial_weight BIGINT := 0;
    v_total_pool BIGINT;
    v_winning_pool BIGINT;
    v_market_options JSONB;
    v_market_title TEXT;
    v_opt JSONB;
BEGIN
    SELECT options, title INTO v_market_options, v_market_title FROM betting_markets WHERE id = p_market_id;
    
    -- Calcolo Virtual Weights
    FOR v_opt IN SELECT * FROM jsonb_array_elements(v_market_options)
    LOOP
        v_total_initial_weights := v_total_initial_weights + COALESCE((v_opt->>'initial_weight')::BIGINT, 100);
        IF v_opt->>'id' = p_winner_option_id THEN
            v_winning_initial_weight := COALESCE((v_opt->>'initial_weight')::BIGINT, 100);
        END IF;
    END LOOP;

    -- Calcolo Reale
    SELECT COALESCE(SUM(amount), 0) INTO v_total_real_bets FROM user_bets WHERE market_id = p_market_id;
    SELECT COALESCE(SUM(amount), 0) INTO v_winning_real_bets FROM user_bets WHERE market_id = p_market_id AND option_id = p_winner_option_id;

    v_total_pool := v_total_real_bets + v_total_initial_weights;
    v_winning_pool := v_winning_real_bets + v_winning_initial_weight;

    IF v_winning_pool > 0 THEN
        -- 1. Aggiorna scommesse vincenti (stato e payout individuale)
        UPDATE user_bets 
        SET status = 'won', is_paid = true, payout = FLOOR((amount::NUMERIC * v_total_pool::NUMERIC) / v_winning_pool::NUMERIC)::BIGINT 
        WHERE market_id = p_market_id AND option_id = p_winner_option_id AND is_paid = false;

        -- 2. Aggiorna scommesse perdenti
        UPDATE user_bets 
        SET status = 'lost', is_paid = true, payout = 0 
        WHERE market_id = p_market_id AND option_id != p_winner_option_id AND is_paid = false;

        -- 3. Paga Vincitori (Aggregato per email utente per evitare il bug dell'UPDATE FROM su righe multiple)
        UPDATE profiles
        SET sheep_balance = profiles.sheep_balance + payouts.total_payout
        FROM (
            SELECT b.user_email, SUM(FLOOR((b.amount::NUMERIC * v_total_pool::NUMERIC) / v_winning_pool::NUMERIC)::BIGINT) AS total_payout
            FROM user_bets b
            WHERE b.market_id = p_market_id AND b.option_id = p_winner_option_id
            GROUP BY b.user_email
        ) payouts
        WHERE LOWER(profiles.email) = LOWER(payouts.user_email);

        -- 4. Notifiche vincitori
        INSERT INTO betting_notifications (user_email, message, is_read)
        SELECT payouts.user_email, 'I tuoi scout sono tornati! Hai vinto ' || payouts.total_payout || ' 🐑 nel mercato ' || v_market_title || '!', false
        FROM (
            SELECT b.user_email, SUM(FLOOR((b.amount::NUMERIC * v_total_pool::NUMERIC) / v_winning_pool::NUMERIC)::BIGINT) AS total_payout
            FROM user_bets b
            WHERE b.market_id = p_market_id AND b.option_id = p_winner_option_id
            GROUP BY b.user_email
        ) payouts;

        -- 5. Notifiche perdenti
        INSERT INTO betting_notifications (user_email, message, is_read)
        SELECT DISTINCT b.user_email, 'Il lupo ha decimato il tuo gregge... Hai perso la scommessa nel mercato ' || v_market_title, false
        FROM user_bets b WHERE b.market_id = p_market_id AND b.option_id != p_winner_option_id;

    END IF;

    UPDATE betting_markets SET status = 'settled', winner_option_id = p_winner_option_id WHERE id = p_market_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
