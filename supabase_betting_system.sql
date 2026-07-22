-- 1. Aggiornamento Profili
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sheep_balance INTEGER DEFAULT 100;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_streamer BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_manage_tournaments BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_manage_civs BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_manage_buildorders BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ALTER COLUMN avatar_url TYPE TEXT;

-- 2. Tabella Mercati (Betting Markets)
CREATE TABLE IF NOT EXISTS betting_markets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_slug TEXT REFERENCES tournaments(slug) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    options JSONB NOT NULL, -- Struttura: [{"id": "...", "label": "...", "initial_weight": 100}]
    status TEXT DEFAULT 'open', -- open, closed, settled, cancelled
    winner_option_id TEXT,
    type TEXT NOT NULL, -- winner, match, series_result
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabella Scommesse Utente (User Bets)
CREATE TABLE IF NOT EXISTS user_bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email TEXT NOT NULL, -- Usiamo email come identificatore principale
    market_id UUID REFERENCES betting_markets(id) ON DELETE CASCADE,
    option_id TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK (amount > 0),
    payout INTEGER DEFAULT 0,
    is_paid BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'pending', -- pending, won, lost, cancelled
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabella Notifiche (Betting Notifications)
CREATE TABLE IF NOT EXISTS betting_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email TEXT NOT NULL, -- Allineato al frontend
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE, -- Allineato al frontend
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RLS Policies
ALTER TABLE betting_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE betting_notifications ENABLE ROW LEVEL SECURITY;

-- Helper function per verificare se l'utente è admin
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS boolean AS $$
BEGIN
  RETURN (
    EXISTS (SELECT 1 FROM profiles WHERE email = auth.jwt() ->> 'email' AND role IN ('admin', 'owner', 'superadmin'))
    OR (auth.jwt() ->> 'email' = 'marco.tamborrino.94@gmail.com')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy per Mercati (Pubblici in lettura, Admin in scrittura)
DROP POLICY IF EXISTS "Markets are public" ON betting_markets;
CREATE POLICY "Markets are public" ON betting_markets FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage markets" ON betting_markets;
CREATE POLICY "Admins can manage markets" ON betting_markets FOR ALL TO authenticated USING (is_admin());

-- Policy per Scommesse (Sola lettura e inserimento)
DROP POLICY IF EXISTS "Users can see their own bets" ON user_bets;
CREATE POLICY "Users can see their own bets" ON user_bets FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert bets" ON user_bets;
CREATE POLICY "Users can insert bets" ON user_bets FOR INSERT WITH CHECK (true);

-- Policy per Notifiche
DROP POLICY IF EXISTS "Users can see their own notifications" ON betting_notifications;
CREATE POLICY "Users can see their own notifications" ON betting_notifications FOR SELECT USING (auth.jwt() ->> 'email' = user_email);
DROP POLICY IF EXISTS "Users can update their own notifications" ON betting_notifications;
CREATE POLICY "Users can update their own notifications" ON betting_notifications FOR UPDATE USING (auth.jwt() ->> 'email' = user_email);

-- 6. Trigger per detrarre il saldo al piazzamento della scommessa con VALIDAZIONE
CREATE OR REPLACE FUNCTION handle_new_bet() 
RETURNS TRIGGER AS $$
DECLARE
    v_balance INTEGER;
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
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_bet_placed ON user_bets;
DROP TRIGGER IF EXISTS on_bet_placed_v4 ON user_bets;
CREATE TRIGGER on_bet_placed
    BEFORE INSERT ON user_bets
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_bet();

-- 7. Funzione RPC per la liquidazione (Pari-Mutuel)
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
