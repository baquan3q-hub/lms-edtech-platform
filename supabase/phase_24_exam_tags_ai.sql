-- Phase 24: Add AI Insights to Exam Submissions
-- This migration adds a column to store the Gemini AI generated feedback for each student's exam submission.

ALTER TABLE exam_submissions
ADD COLUMN IF NOT EXISTS ai_insight TEXT;

-- Notify: You may need to run this snippet in your Supabase SQL Editor manually if you aren't using CLI migrations.