
CREATE OR REPLACE FUNCTION settle_betting_market(
    p_market_id UUID,
    p_winning_option_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_real_bets BIGINT;
    v_winning_real_bets BIGINT;
    v_total_initial_weights BIGINT := 0;
    v_winning_initial_weight BIGINT := 0;
    v_total_pool BIGINT;
    v_winning_pool BIGINT;
    v_market_options JSONB;
    v_opt JSONB;
BEGIN
    -- 1. Ottieni le opzioni del mercato per leggere i pesi iniziali
    SELECT options INTO v_market_options FROM betting_markets WHERE id = p_market_id;
    
    -- 2. Calcola i pesi iniziali totali e quello dell'opzione vincente
    FOR v_opt IN SELECT * FROM jsonb_array_elements(v_market_options)
    LOOP
        v_total_initial_weights := v_total_initial_weights + COALESCE((v_opt->>'initial_weight')::BIGINT, 100);
        IF v_opt->>'id' = p_winning_option_id THEN
            v_winning_initial_weight := COALESCE((v_opt->>'initial_weight')::BIGINT, 100);
        END IF;
    END LOOP;

    -- 3. Calcola il totale delle scommesse reali
    SELECT COALESCE(SUM(amount), 0) INTO v_total_real_bets
    FROM user_bets
    WHERE market_id = p_market_id;

    -- 4. Calcola il totale delle scommesse vincenti reali
    SELECT COALESCE(SUM(amount), 0) INTO v_winning_real_bets
    FROM user_bets
    WHERE market_id = p_market_id AND option_id = p_winning_option_id;

    -- 5. Calcola i pool totali (Reali + Virtuali)
    v_total_pool := v_total_real_bets + v_total_initial_weights;
    v_winning_pool := v_winning_real_bets + v_winning_initial_weight;

    -- Protezione divisione per zero
    IF v_winning_pool = 0 THEN
        UPDATE betting_markets SET status = 'settled', winning_option_id = p_winning_option_id WHERE id = p_market_id;
        RETURN;
    END IF;

    -- 6. Paga i vincitori (Quote Dinamiche Pari-Mutuel basate su Pool Totale / Pool Vincente)
    UPDATE user_profiles
    SET sheep_balance = sheep_balance + FLOOR(
        (b.amount::NUMERIC * v_total_pool::NUMERIC) / v_winning_pool::NUMERIC
    )::BIGINT
    FROM user_bets b
    WHERE user_profiles.email = b.user_email
      AND b.market_id = p_market_id
      AND b.option_id = p_winning_option_id
      AND b.is_paid = false;

    -- 7. Segna le scommesse come pagate e aggiorna lo stato
    UPDATE user_bets SET status = 'won', is_paid = true, payout = FLOOR((amount::NUMERIC * v_total_pool::NUMERIC) / v_winning_pool::NUMERIC)::BIGINT WHERE market_id = p_market_id AND option_id = p_winning_option_id;
    UPDATE user_bets SET status = 'lost', is_paid = true, payout = 0 WHERE market_id = p_market_id AND option_id != p_winning_option_id;
    UPDATE betting_markets SET status = 'settled', winning_option_id = p_winning_option_id WHERE id = p_market_id;
END;
$$;
