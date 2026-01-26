-- Add Code Mode Settings
-- This migration adds columns to support the code mode typing practice feature

-- ============================================================================
-- SETTINGS TABLE UPDATES
-- Add code mode related columns
-- ============================================================================

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS code_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS code_lang TEXT DEFAULT 'c',
ADD COLUMN IF NOT EXISTS code_snippet_source TEXT DEFAULT 'bundled',
ADD COLUMN IF NOT EXISTS custom_code_path TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS tab_width INTEGER DEFAULT 4;

-- Add a comment for documentation
COMMENT ON COLUMN public.settings.code_mode IS 'Whether code mode is enabled for typing practice';
COMMENT ON COLUMN public.settings.code_lang IS 'Programming language for code snippets (c, python, javascript)';
COMMENT ON COLUMN public.settings.code_snippet_source IS 'Source of code snippets (bundled, generated, file)';
COMMENT ON COLUMN public.settings.custom_code_path IS 'Path to user-specified code file for practice';
COMMENT ON COLUMN public.settings.tab_width IS 'Number of spaces for tab indentation (2 or 4)';

-- ============================================================================
-- RESULTS TABLE UPDATES
-- Add code mode tracking to results
-- ============================================================================

ALTER TABLE public.results
ADD COLUMN IF NOT EXISTS code_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS code_lang TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.results.code_mode IS 'Whether this result was from code mode practice';
COMMENT ON COLUMN public.results.code_lang IS 'Programming language used if code_mode is true';

-- Create an index for filtering code mode results
CREATE INDEX IF NOT EXISTS idx_results_code_mode ON public.results(code_mode) WHERE code_mode = true;
