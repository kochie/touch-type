-- PvP System Database Schema
-- This migration creates tables for PvP challenges (async and future real-time)

-- ============================================================================
-- PVP_CHALLENGES TABLE
-- Stores PvP challenge data between users
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pvp_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenger_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    opponent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    challenge_code VARCHAR(8) UNIQUE,  -- Short code for shareable links
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'expired', 'declined')),
    
    -- Match settings (challenger picks)
    keyboard VARCHAR(50) NOT NULL,
    level VARCHAR(20) NOT NULL,
    language VARCHAR(10) NOT NULL,
    capital BOOLEAN DEFAULT false,
    punctuation BOOLEAN DEFAULT false,
    numbers BOOLEAN DEFAULT false,
    word_set TEXT[] NOT NULL,  -- Fixed words for fair comparison
    
    -- Results (references to results table)
    challenger_result_id UUID REFERENCES public.results(id) ON DELETE SET NULL,
    opponent_result_id UUID REFERENCES public.results(id) ON DELETE SET NULL,
    winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Challenge metadata
    message TEXT,  -- Optional message from challenger
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pvp_challenges_challenger_id ON public.pvp_challenges(challenger_id);
CREATE INDEX IF NOT EXISTS idx_pvp_challenges_opponent_id ON public.pvp_challenges(opponent_id);
CREATE INDEX IF NOT EXISTS idx_pvp_challenges_status ON public.pvp_challenges(status);
CREATE INDEX IF NOT EXISTS idx_pvp_challenges_code ON public.pvp_challenges(challenge_code);
CREATE INDEX IF NOT EXISTS idx_pvp_challenges_expires ON public.pvp_challenges(expires_at);

-- Enable RLS on pvp_challenges
ALTER TABLE public.pvp_challenges ENABLE ROW LEVEL SECURITY;

-- Users can view challenges they're involved in (as challenger or opponent)
CREATE POLICY "Users can view own challenges" ON public.pvp_challenges
    FOR SELECT USING (
        auth.uid() = challenger_id OR 
        auth.uid() = opponent_id OR
        (opponent_id IS NULL AND status = 'pending')  -- Can see open challenges by code
    );

-- Users can create challenges (as challenger)
CREATE POLICY "Users can create challenges" ON public.pvp_challenges
    FOR INSERT WITH CHECK (auth.uid() = challenger_id);

-- Users can update challenges they're involved in
CREATE POLICY "Users can update own challenges" ON public.pvp_challenges
    FOR UPDATE USING (
        auth.uid() = challenger_id OR 
        auth.uid() = opponent_id
    );

-- Users can delete their own challenges (only if they created it and it's not completed)
CREATE POLICY "Users can delete own challenges" ON public.pvp_challenges
    FOR DELETE USING (
        auth.uid() = challenger_id AND 
        status IN ('pending', 'expired', 'declined')
    );

-- ============================================================================
-- PVP_CHALLENGE_INVITES TABLE
-- Stores invite links for challenges (for sharing externally)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pvp_challenge_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID REFERENCES public.pvp_challenges(id) ON DELETE CASCADE NOT NULL,
    invite_code VARCHAR(12) UNIQUE NOT NULL,
    used BOOLEAN DEFAULT false,
    used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for invite code lookup
CREATE INDEX IF NOT EXISTS idx_pvp_invites_code ON public.pvp_challenge_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_pvp_invites_challenge ON public.pvp_challenge_invites(challenge_id);

-- Enable RLS on invites
ALTER TABLE public.pvp_challenge_invites ENABLE ROW LEVEL SECURITY;

-- Anyone can view invites by code (needed for accepting)
CREATE POLICY "Anyone can view invites" ON public.pvp_challenge_invites
    FOR SELECT USING (true);

-- Challenge owners can create invites
CREATE POLICY "Challenge owners can create invites" ON public.pvp_challenge_invites
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.pvp_challenges 
            WHERE id = challenge_id AND challenger_id = auth.uid()
        )
    );

-- Invites can be updated (marked as used) by anyone accepting
CREATE POLICY "Users can update invites" ON public.pvp_challenge_invites
    FOR UPDATE USING (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate a random challenge code
CREATE OR REPLACE FUNCTION public.generate_challenge_code(length INTEGER DEFAULT 8)
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- Excluding confusing chars like 0/O, 1/I
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to generate a unique invite code
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := public.generate_challenge_code(12);
        SELECT EXISTS(
            SELECT 1 FROM public.pvp_challenge_invites WHERE invite_code = new_code
        ) INTO code_exists;
        EXIT WHEN NOT code_exists;
    END LOOP;
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate challenge code on insert
CREATE OR REPLACE FUNCTION public.set_challenge_code()
RETURNS TRIGGER AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    IF NEW.challenge_code IS NULL THEN
        LOOP
            new_code := public.generate_challenge_code(8);
            SELECT EXISTS(
                SELECT 1 FROM public.pvp_challenges WHERE challenge_code = new_code
            ) INTO code_exists;
            EXIT WHEN NOT code_exists;
        END LOOP;
        NEW.challenge_code := new_code;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set challenge code
DROP TRIGGER IF EXISTS set_pvp_challenge_code ON public.pvp_challenges;
CREATE TRIGGER set_pvp_challenge_code
    BEFORE INSERT ON public.pvp_challenges
    FOR EACH ROW EXECUTE FUNCTION public.set_challenge_code();

-- Function to determine winner when both results are submitted
CREATE OR REPLACE FUNCTION public.determine_pvp_winner()
RETURNS TRIGGER AS $$
DECLARE
    challenger_cpm FLOAT;
    opponent_cpm FLOAT;
    challenger_accuracy FLOAT;
    opponent_accuracy FLOAT;
BEGIN
    -- Only process if both results are now set and no winner yet
    IF NEW.challenger_result_id IS NOT NULL 
       AND NEW.opponent_result_id IS NOT NULL 
       AND NEW.winner_id IS NULL THEN
        
        -- Get challenger result
        SELECT cpm, (correct::FLOAT / NULLIF(correct + incorrect, 0)) * 100
        INTO challenger_cpm, challenger_accuracy
        FROM public.results WHERE id = NEW.challenger_result_id;
        
        -- Get opponent result
        SELECT cpm, (correct::FLOAT / NULLIF(correct + incorrect, 0)) * 100
        INTO opponent_cpm, opponent_accuracy
        FROM public.results WHERE id = NEW.opponent_result_id;
        
        -- Determine winner (CPM first, accuracy as tiebreaker)
        IF challenger_cpm > opponent_cpm THEN
            NEW.winner_id := NEW.challenger_id;
        ELSIF opponent_cpm > challenger_cpm THEN
            NEW.winner_id := NEW.opponent_id;
        ELSIF challenger_accuracy > opponent_accuracy THEN
            NEW.winner_id := NEW.challenger_id;
        ELSIF opponent_accuracy > challenger_accuracy THEN
            NEW.winner_id := NEW.opponent_id;
        -- If still tied, challenger wins (first mover advantage)
        ELSE
            NEW.winner_id := NEW.challenger_id;
        END IF;
        
        -- Update status to completed
        NEW.status := 'completed';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to determine winner when results are submitted
DROP TRIGGER IF EXISTS determine_pvp_winner ON public.pvp_challenges;
CREATE TRIGGER determine_pvp_winner
    BEFORE UPDATE ON public.pvp_challenges
    FOR EACH ROW EXECUTE FUNCTION public.determine_pvp_winner();

-- Add updated_at trigger for pvp_challenges
DROP TRIGGER IF EXISTS update_pvp_challenges_updated_at ON public.pvp_challenges;
CREATE TRIGGER update_pvp_challenges_updated_at
    BEFORE UPDATE ON public.pvp_challenges
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for getting challenges with user details
CREATE OR REPLACE VIEW public.pvp_challenges_view AS
SELECT 
    c.*,
    cp.preferred_username as challenger_username,
    cp.email as challenger_email,
    op.preferred_username as opponent_username,
    op.email as opponent_email,
    cr.cpm as challenger_cpm,
    cr.correct as challenger_correct,
    cr.incorrect as challenger_incorrect,
    opr.cpm as opponent_cpm,
    opr.correct as opponent_correct,
    opr.incorrect as opponent_incorrect,
    wp.preferred_username as winner_username
FROM public.pvp_challenges c
LEFT JOIN public.profiles cp ON c.challenger_id = cp.id
LEFT JOIN public.profiles op ON c.opponent_id = op.id
LEFT JOIN public.results cr ON c.challenger_result_id = cr.id
LEFT JOIN public.results opr ON c.opponent_result_id = opr.id
LEFT JOIN public.profiles wp ON c.winner_id = wp.id;

-- ============================================================================
-- REALTIME SUBSCRIPTIONS
-- Enable realtime for pvp tables
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.pvp_challenges;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT ALL ON public.pvp_challenges TO anon, authenticated;
GRANT ALL ON public.pvp_challenge_invites TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_challenge_code TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invite_code TO anon, authenticated;
