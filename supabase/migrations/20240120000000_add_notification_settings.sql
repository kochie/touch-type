-- Add notification and schedule settings to the settings table
-- Migration for Touch Typer practice reminder notifications

-- Add new columns for notification settings
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_time TEXT DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS notification_days TEXT[] DEFAULT ARRAY['mon', 'tue', 'wed', 'thu', 'fri'],
ADD COLUMN IF NOT EXISTS notification_message TEXT DEFAULT 'Time to practice your typing!',
ADD COLUMN IF NOT EXISTS practice_duration INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS schedule_enabled BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.settings.notifications_enabled IS 'Whether practice reminder notifications are enabled';
COMMENT ON COLUMN public.settings.notification_time IS 'Time of day for notifications in HH:MM format';
COMMENT ON COLUMN public.settings.notification_days IS 'Days of the week for notifications (mon, tue, wed, thu, fri, sat, sun)';
COMMENT ON COLUMN public.settings.notification_message IS 'Custom message to display in notifications';
COMMENT ON COLUMN public.settings.practice_duration IS 'Default practice session duration in minutes';
COMMENT ON COLUMN public.settings.schedule_enabled IS 'Whether calendar scheduling is enabled';
