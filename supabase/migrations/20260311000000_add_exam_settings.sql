-- Add strict mode and show answers settings to exams table
ALTER TABLE exams ADD COLUMN IF NOT EXISTS is_strict_mode BOOLEAN DEFAULT false;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS strict_mode_limit INTEGER DEFAULT 0;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS show_answers BOOLEAN DEFAULT true;
