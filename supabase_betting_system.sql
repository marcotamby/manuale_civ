-- 1. Profiles update
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sheep_balance INTEGER DEFAULT 100;

-- 2. Betting Markets table
CREATE TABLE IF NOT EXISTS betting_markets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_slug TEXT REFERENCES tournaments(slug) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    options JSONB NOT NULL, -- e.g. [{"id": "opt1", "label": "Team A", "total_bet": 1000}, {"id": "opt2", "label": "Team B", "total_bet": 500}]
    status TEXT DEFAULT 'open', -- open, closed, settled, cancelled
    winner_option_id TEXT,
    type TEXT NOT NULL, -- winner, match, series_result
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. User Bets table
CREATE TABLE IF NOT EXISTS user_bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    market_id UUID REFERENCES betting_markets(id) ON DELETE CASCADE,
    option_id TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK (amount > 0),
    payout INTEGER,
    status TEXT DEFAULT 'pending', -- pending, won, lost, cancelled
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Betting Notifications table
CREATE TABLE IF NOT EXISTS betting_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RLS Policies
ALTER TABLE betting_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE betting_notifications ENABLE ROW LEVEL SECURITY;

-- Markets are public
CREATE POLICY "Markets are public" ON betting_markets FOR SELECT USING (true);

-- Users can only see their own bets
CREATE POLICY "Users can see their own bets" ON user_bets FOR SELECT USING (auth.uid() = user_id);

-- Users can insert bets
CREATE POLICY "Users can insert bets" ON user_bets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can see their own notifications
CREATE POLICY "Users can see their own notifications" ON betting_notifications FOR SELECT USING (auth.uid() = user_id);

-- Users can update their notifications (to mark as read)
CREATE POLICY "Users can update their own notifications" ON betting_notifications FOR UPDATE USING (auth.uid() = user_id);

-- Function to handle sheep balance on bet placement
CREATE OR REPLACE FUNCTION handle_new_bet() 
RETURNS TRIGGER AS $$
BEGIN
    -- Deduct sheep from profile
    UPDATE profiles 
    SET sheep_balance = sheep_balance - NEW.amount
    WHERE id = NEW.user_id;
    
    -- Update total bet in market options
    -- Note: This is a simplified totalizer logic. In a real app, you'd want to handle this more robustly.
    UPDATE betting_markets
    SET options = (
        SELECT jsonb_agg(
            CASE 
                WHEN (opt->>'id') = NEW.option_id THEN 
                    opt || jsonb_build_object('total_bet', (COALESCE((opt->>'total_bet')::int, 0) + NEW.amount))
                ELSE opt 
            END
        )
        FROM jsonb_array_elements(options) AS opt
    )
    WHERE id = NEW.market_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_bet_placed
    AFTER INSERT ON user_bets
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_bet();

-- Function to settle a betting market
CREATE OR REPLACE FUNCTION settle_betting_market(p_market_id UUID, p_winner_option_id TEXT)
RETURNS void AS $$
DECLARE
    total_pool INTEGER;
    winner_pool INTEGER;
    v_bet RECORD;
    payout_amount INTEGER;
BEGIN
    -- 1. Get total pool and winner pool
    SELECT 
        SUM((opt->>'total_bet')::int) INTO total_pool
    FROM betting_markets, jsonb_array_elements(options) AS opt
    WHERE id = p_market_id;

    SELECT 
        SUM((opt->>'total_bet')::int) INTO winner_pool
    FROM betting_markets, jsonb_array_elements(options) AS opt
    WHERE id = p_market_id AND (opt->>'id') = p_winner_option_id;

    -- 2. If no bets on winner, maybe refund or keep? Let's keep it simple: no winner_pool = no payouts.
    IF winner_pool IS NULL OR winner_pool = 0 THEN
        UPDATE user_bets SET status = 'lost' WHERE market_id = p_market_id;
    ELSE
        -- 3. Iterate over winning bets and pay out
        FOR v_bet IN SELECT * FROM user_bets WHERE market_id = p_market_id AND option_id = p_winner_option_id LOOP
            payout_amount := floor((v_bet.amount::float / winner_pool::float) * total_pool::float);
            
            -- Update bet
            UPDATE user_bets SET status = 'won', payout = payout_amount WHERE id = v_bet.id;
            
            -- Update profile
            UPDATE profiles SET sheep_balance = sheep_balance + payout_amount WHERE id = v_bet.user_id;
            
            -- Notify user
            INSERT INTO betting_notifications (user_id, message)
            VALUES (v_bet.user_id, 'I tuoi scout sono tornati! Hai vinto ' || payout_amount || ' 🐑 nel mercato ' || (SELECT title FROM betting_markets WHERE id = p_market_id) || '!');
        END LOOP;

        -- 4. Mark other bets as lost
        UPDATE user_bets SET status = 'lost' WHERE market_id = p_market_id AND option_id != p_winner_option_id;
        
        -- Notify losers
        FOR v_bet IN SELECT * FROM user_bets WHERE market_id = p_market_id AND option_id != p_winner_option_id LOOP
            INSERT INTO betting_notifications (user_id, message)
            VALUES (v_bet.user_id, 'Il lupo ha decimato il tuo gregge... Hai perso la scommessa nel mercato ' || (SELECT title FROM betting_markets WHERE id = p_market_id) || '.');
        END LOOP;
    END IF;

    -- 5. Update market status
    UPDATE betting_markets 
    SET status = 'settled', winner_option_id = p_winner_option_id 
    WHERE id = p_market_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
