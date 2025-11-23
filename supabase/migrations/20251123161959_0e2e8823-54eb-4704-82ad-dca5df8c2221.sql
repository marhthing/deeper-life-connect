-- Update attendance table to track stream viewing
ALTER TABLE public.attendance
ADD COLUMN stream_title TEXT,
ADD COLUMN stream_url TEXT,
ADD COLUMN join_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN leave_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN duration_minutes INTEGER;

-- Rename check_in_time to maintain compatibility
ALTER TABLE public.attendance
DROP COLUMN check_in_time;

-- Update the insert policy description
DROP POLICY IF EXISTS "Users can insert their own attendance" ON public.attendance;

CREATE POLICY "Users can insert their own attendance"
ON public.attendance
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = member_id);

-- Add update policy to allow updating leave time and duration
CREATE POLICY "Users can update their own attendance"
ON public.attendance
FOR UPDATE
TO authenticated
USING (auth.uid() = member_id)
WITH CHECK (auth.uid() = member_id);