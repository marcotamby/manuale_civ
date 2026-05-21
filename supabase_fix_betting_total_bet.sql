-- 1. Aggiorna la funzione handle_new_bet per incrementare il campo total_bet
CREATE OR REPLACE FUNCTION handle_new_bet() 
RETURNS TRIGGER AS $$
DECLARE
    v_balance INTEGER;
    v_market_options JSONB;
BEGIN
    -- Recupera il saldo attuale con blocco per evitare race conditions (case-insensitive)
    SELECT sheep_balance INTO v_balance 
    FROM profiles 
    WHERE LOWER(email) = LOWER(NEW.user_email)
    FOR UPDATE;

    IF v_balance IS NULL THEN
        RAISE EXCEPTION 'Profilo non trovato per l''email %', NEW.user_email;
    END IF;

    IF v_balance < NEW.amount THEN
        RAISE EXCEPTION 'GREGGE INSUFFICIENTE! Hai % pecore, ma ne servono % per questa scommessa.', v_balance, NEW.amount;
    END IF;

    UPDATE profiles 
    SET sheep_balance = sheep_balance - NEW.amount
    WHERE LOWER(email) = LOWER(NEW.user_email);
    
    -- Lock betting market per evitare race condition ed aggiornare total_bet
    SELECT options INTO v_market_options
    FROM betting_markets
    WHERE id = NEW.market_id
    FOR UPDATE;

    IF v_market_options IS NOT NULL THEN
        UPDATE betting_markets
        SET options = (
            SELECT jsonb_agg(
                CASE 
                    WHEN obj->>'id' = NEW.option_id THEN 
                        jsonb_set(obj, '{total_bet}', to_jsonb(COALESCE((obj->>'total_bet')::numeric, 0) + NEW.amount))
                    ELSE 
                        obj
                END
            )
            FROM jsonb_array_elements(v_market_options) AS obj
        )
        WHERE id = NEW.market_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
