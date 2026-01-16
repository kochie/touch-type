-- Touch Typer Database Schema for Supabase
-- This migration creates all necessary tables with Row Level Security (RLS) policies

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE
-- Stores user metadata linked to auth.users
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    name TEXT,
    phone_number TEXT,
    preferred_username TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can only view and update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, phone_number)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'phone_number'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- SETTINGS TABLE
-- Stores user preferences and settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    analytics BOOLEAN DEFAULT true,
    blinker BOOLEAN DEFAULT true,
    capital BOOLEAN DEFAULT false,
    keyboard_name TEXT DEFAULT 'MACOS_US_QWERTY',
    language TEXT DEFAULT 'en',
    level_name TEXT DEFAULT '1',
    numbers BOOLEAN DEFAULT false,
    publish_to_leaderboard BOOLEAN DEFAULT true,
    punctuation BOOLEAN DEFAULT false,
    theme TEXT DEFAULT 'system',
    whats_new_on_startup BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Users can only access their own settings
CREATE POLICY "Users can view own settings" ON public.settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings" ON public.settings
    FOR DELETE USING (auth.uid() = user_id);

-- Function to create default settings for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.settings (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create settings on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_settings
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_settings();

-- ============================================================================
-- RESULTS TABLE
-- Stores typing test results with key press data
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    correct INTEGER NOT NULL,
    incorrect INTEGER NOT NULL,
    time TEXT NOT NULL,
    datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    level TEXT NOT NULL,
    keyboard TEXT NOT NULL,
    language TEXT NOT NULL,
    capital BOOLEAN DEFAULT false,
    punctuation BOOLEAN DEFAULT false,
    numbers BOOLEAN DEFAULT false,
    cpm FLOAT NOT NULL,
    key_presses JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_results_user_id ON public.results(user_id);
CREATE INDEX IF NOT EXISTS idx_results_datetime ON public.results(datetime);
CREATE INDEX IF NOT EXISTS idx_results_user_datetime ON public.results(user_id, datetime);

-- Enable RLS on results
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- Users can only access their own results
CREATE POLICY "Users can view own results" ON public.results
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own results" ON public.results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own results" ON public.results
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- GOALS TABLE
-- Stores user goals with requirements
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    keyboard TEXT NOT NULL,
    language TEXT NOT NULL,
    level TEXT NOT NULL,
    complete BOOLEAN DEFAULT false,
    requirement JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, category)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_goals_user_category ON public.goals(user_id, category);

-- Enable RLS on goals
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Users can only access their own goals
CREATE POLICY "Users can view own goals" ON public.goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals" ON public.goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON public.goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON public.goals
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- CHALLENGES TABLE
-- Stores user challenges
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    keyboard TEXT NOT NULL,
    level TEXT NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, category)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_challenges_user_category ON public.challenges(user_id, category);

-- Enable RLS on challenges
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Users can only access their own challenges
CREATE POLICY "Users can view own challenges" ON public.challenges
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenges" ON public.challenges
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenges" ON public.challenges
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own challenges" ON public.challenges
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- LEADERBOARD_SCORES TABLE
-- Stores public leaderboard entries
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.leaderboard_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    username TEXT NOT NULL,
    correct INTEGER NOT NULL,
    incorrect INTEGER NOT NULL,
    cpm FLOAT NOT NULL,
    datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    keyboard TEXT NOT NULL,
    level TEXT NOT NULL,
    capital BOOLEAN DEFAULT false,
    punctuation BOOLEAN DEFAULT false,
    numbers BOOLEAN DEFAULT false,
    time INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_keyboard_level ON public.leaderboard_scores(keyboard, level);
CREATE INDEX IF NOT EXISTS idx_leaderboard_cpm ON public.leaderboard_scores(cpm DESC);

-- Enable RLS on leaderboard_scores
ALTER TABLE public.leaderboard_scores ENABLE ROW LEVEL SECURITY;

-- Everyone can view leaderboard scores (public)
CREATE POLICY "Anyone can view leaderboard scores" ON public.leaderboard_scores
    FOR SELECT USING (true);

-- Users can only insert their own scores
CREATE POLICY "Users can insert own leaderboard scores" ON public.leaderboard_scores
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own scores
CREATE POLICY "Users can update own leaderboard scores" ON public.leaderboard_scores
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own scores
CREATE POLICY "Users can delete own leaderboard scores" ON public.leaderboard_scores
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- SUBSCRIPTIONS TABLE
-- Stores billing/plan information
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    billing_plan TEXT DEFAULT 'free',
    billing_period TEXT,
    next_billing_date TIMESTAMPTZ,
    auto_renew BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'active',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    apple_original_transaction_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only view their own subscription
CREATE POLICY "Users can view own subscription" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert/update subscriptions (for webhook handlers)
CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Function to create default subscription for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.subscriptions (user_id, billing_plan, status)
    VALUES (NEW.id, 'free', 'active');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create subscription on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
    BEFORE UPDATE ON public.goals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for getting user results with pagination
CREATE OR REPLACE VIEW public.user_results_view AS
SELECT 
    r.*,
    p.preferred_username as username
FROM public.results r
LEFT JOIN public.profiles p ON r.user_id = p.id
ORDER BY r.datetime DESC;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
