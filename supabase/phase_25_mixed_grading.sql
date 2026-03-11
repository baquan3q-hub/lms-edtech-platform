-- Phase 25: Add Manual Grading Status to Exam Submissions
-- This migration adds a status column to track whether an exam requires manual grading (e.g. essays).

ALTER TABLE exam_submissions
ADD COLUMN IF NOT EXISTS grading_status TEXT DEFAULT 'graded';

-- Notify: You may need to run this snippet in your Supabase SQL Editor manually if you aren't using CLI migrations.
