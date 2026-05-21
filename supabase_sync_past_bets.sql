-- Questo script ricalcola retroattivamente il campo "total_bet" 
-- di tutte le opzioni nei mercati non ancora liquidati,
-- basandosi sulle scommesse effettive presenti nella tabella user_bets.

DO $$
DECLARE
    market_row RECORD;
    updated_options JSONB;
BEGIN
    -- Selezioniamo tutti i mercati che non sono ancora settled
    FOR market_row IN 
        SELECT id, options FROM betting_markets WHERE status IN ('open', 'closed')
    LOOP
        -- Ricostruiamo l'array JSON delle opzioni calcolando la somma per ciascuna
        SELECT jsonb_agg(
            jsonb_set(
                obj, 
                '{total_bet}', 
                to_jsonb(
                    COALESCE(
                        (SELECT SUM(amount) FROM user_bets WHERE market_id = market_row.id AND option_id = obj->>'id' AND status != 'cancelled'),
                        0
                    )
                )
            )
        )
        INTO updated_options
        FROM jsonb_array_elements(market_row.options) AS obj;

        -- Aggiorniamo il mercato se ci sono opzioni valide
        IF updated_options IS NOT NULL THEN
            UPDATE betting_markets
            SET options = updated_options
            WHERE id = market_row.id;
        END IF;
    END LOOP;
END;
$$;
