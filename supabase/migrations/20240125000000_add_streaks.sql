-- Add streaks table for tracking user practice streaks
-- This migration creates the streaks table and a trigger to auto-update streaks on result insert

-- ============================================================================
-- STREAKS TABLE
-- Stores user streak data including current streak, longest streak, and freeze info
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.streaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    streak_freeze_count INTEGER DEFAULT 0,      -- Premium: freezes available
    streak_freeze_used_at DATE,                 -- When freeze was last applied
    last_freeze_refresh DATE,                   -- When freezes were last refreshed (weekly)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_streaks_user_id ON public.streaks(user_id);

-- Enable RLS on streaks
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

-- Users can only view their own streak
CREATE POLICY "Users can view own streak" ON public.streaks
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own streak (for freeze management)
CREATE POLICY "Users can update own streak" ON public.streaks
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can insert their own streak
CREATE POLICY "Users can insert own streak" ON public.streaks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- STREAK UPDATE FUNCTION
-- Called automatically when a new result is inserted
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_streak_on_result()
RETURNS TRIGGER AS $$
DECLARE
    result_date DATE;
    streak_record RECORD;
    days_since_last INTEGER;
BEGIN
    -- Convert datetime to date in user's context (stored as UTC)
    result_date := (NEW.datetime AT TIME ZONE 'UTC')::DATE;
    
    -- Get existing streak record
    SELECT * INTO streak_record FROM public.streaks WHERE user_id = NEW.user_id;
    
    IF streak_record IS NULL THEN
        -- First result ever - create streak record
        INSERT INTO public.streaks (user_id, current_streak, longest_streak, last_activity_date)
        VALUES (NEW.user_id, 1, 1, result_date);
    ELSE
        -- Calculate days since last activity
        IF streak_record.last_activity_date IS NULL THEN
            days_since_last := NULL;
        ELSE
            days_since_last := result_date - streak_record.last_activity_date;
        END IF;
        
        IF days_since_last IS NULL THEN
            -- No previous activity date, start fresh
            UPDATE public.streaks SET
                current_streak = 1,
                longest_streak = GREATEST(streak_record.longest_streak, 1),
                last_activity_date = result_date,
                updated_at = NOW()
            WHERE user_id = NEW.user_id;
        ELSIF days_since_last = 0 THEN
            -- Same day - no streak change needed, but ensure longest is correct
            UPDATE public.streaks SET
                longest_streak = GREATEST(streak_record.longest_streak, streak_record.current_streak),
                updated_at = NOW()
            WHERE user_id = NEW.user_id;
        ELSIF days_since_last = 1 THEN
            -- Consecutive day - increment streak
            UPDATE public.streaks SET
                current_streak = streak_record.current_streak + 1,
                longest_streak = GREATEST(streak_record.longest_streak, streak_record.current_streak + 1),
                last_activity_date = result_date,
                updated_at = NOW()
            WHERE user_id = NEW.user_id;
        ELSIF days_since_last = 2 
              AND streak_record.streak_freeze_count > 0 
              AND (streak_record.streak_freeze_used_at IS NULL OR streak_record.streak_freeze_used_at < result_date - 1) THEN
            -- Missed exactly one day and have freeze available - use it
            UPDATE public.streaks SET
                current_streak = streak_record.current_streak + 1,
                longest_streak = GREATEST(streak_record.longest_streak, streak_record.current_streak + 1),
                last_activity_date = result_date,
                streak_freeze_count = streak_record.streak_freeze_count - 1,
                streak_freeze_used_at = result_date - 1,
                updated_at = NOW()
            WHERE user_id = NEW.user_id;
        ELSE
            -- Streak broken - reset to 1
            UPDATE public.streaks SET
                current_streak = 1,
                last_activity_date = result_date,
                updated_at = NOW()
            WHERE user_id = NEW.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on results insert to update streak
DROP TRIGGER IF EXISTS on_result_insert_update_streak ON public.results;
CREATE TRIGGER on_result_insert_update_streak
    AFTER INSERT ON public.results
    FOR EACH ROW
    EXECUTE FUNCTION public.update_streak_on_result();

-- ============================================================================
-- AUTO-CREATE STREAK RECORD FOR NEW USERS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_streak()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.streaks (user_id, current_streak, longest_streak)
    VALUES (NEW.id, 0, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create streak record on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_streak ON auth.users;
CREATE TRIGGER on_auth_user_created_streak
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_streak();

-- ============================================================================
-- ADD UPDATED_AT TRIGGER FOR STREAKS
-- ============================================================================
DROP TRIGGER IF EXISTS update_streaks_updated_at ON public.streaks;
CREATE TRIGGER update_streaks_updated_at
    BEFORE UPDATE ON public.streaks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.streaks TO anon, authenticated;
