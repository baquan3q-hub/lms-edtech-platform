## Table `users`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `email` | `text` |  Unique |
| `role` | `text` |  |
| `full_name` | `text` |  |
| `phone` | `text` |  Nullable |
| `avatar_url` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `invite_code` | `text` |  Nullable Unique |
| `invite_code_expires_at` | `timestamptz` |  Nullable |

## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Unique |
| `bio` | `text` |  Nullable |
| `date_of_birth` | `date` |  Nullable |
| `address` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `gender` | `text` |  Nullable |
| `phone_number` | `text` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `grade_level` | `text` |  Nullable |
| `school_name` | `text` |  Nullable |
| `subject_specialty` | `text` |  Nullable |
| `years_of_experience` | `int4` |  Nullable |
| `occupation` | `text` |  Nullable |

## Table `parent_students`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `parent_id` | `uuid` |  |
| `student_id` | `uuid` |  |
| `created_at` | `timestamptz` |  Nullable |
| `relationship` | `text` |  Nullable |
| `is_primary` | `bool` |  Nullable |

## Table `courses`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `mode` | `text` |  Nullable |

## Table `classes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `course_id` | `uuid` |  |
| `teacher_id` | `uuid` |  |
| `room` | `text` |  Nullable |
| `schedule` | `jsonb` |  Nullable |
| `max_students` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `status` | `text` |  Nullable |
| `name` | `text` |  Nullable |

## Table `enrollments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `student_id` | `uuid` |  |
| `class_id` | `uuid` |  |
| `enrolled_at` | `timestamptz` |  Nullable |
| `status` | `text` |  Nullable |

## Table `attendance`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `student_id` | `uuid` |  |
| `class_id` | `uuid` |  |
| `date` | `date` |  |
| `status` | `text` |  Nullable |
| `note` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `notifications`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `title` | `text` |  |
| `message` | `text` |  Nullable |
| `type` | `text` |  Nullable |
| `is_read` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `metadata` | `jsonb` |  Nullable |
| `link` | `text` |  Nullable |

## Table `announcements`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `class_id` | `uuid` |  |
| `teacher_id` | `uuid` |  |
| `title` | `text` |  |
| `content` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `resource_id` | `uuid` |  Nullable |
| `resource_type` | `text` |  Nullable |
| `file_url` | `text` |  Nullable |
| `video_url` | `text` |  Nullable |
| `link_url` | `text` |  Nullable |
| `quiz_data` | `jsonb` |  Nullable |
| `attachments` | `jsonb` |  Nullable |
| `quiz_id` | `uuid` |  Nullable |
| `target_roles` | `_text` |  Nullable |
| `is_pinned` | `bool` |  Nullable |
| `updated_at` | `timestamp` |  Nullable |
| `scope` | `text` |  Nullable |
| `course_id` | `uuid` |  Nullable |
| `target_user_ids` | `_uuid` |  Nullable |
| `created_by_role` | `text` |  Nullable |

## Table `feedback`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `parent_id` | `uuid` |  |
| `content` | `text` |  |
| `type` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `leave_requests`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `student_id` | `uuid` |  |
| `parent_id` | `uuid` |  |
| `class_id` | `uuid` |  |
| `start_date` | `date` |  |
| `end_date` | `date` |  |
| `reason` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `ai_analyses`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `student_id` | `uuid` |  |
| `type` | `text` |  |
| `result_json` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `grade_reports`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `student_id` | `uuid` |  |
| `class_id` | `uuid` |  |
| `period` | `text` |  |
| `report_json` | `jsonb` |  Nullable |
| `sent_at` | `timestamptz` |  Nullable |

## Table `lessons`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `class_id` | `uuid` |  |
| `title` | `text` |  |
| `content` | `text` |  Nullable |
| `video_url` | `text` |  Nullable |
| `order` | `int4` |  |
| `published_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `attachments` | `jsonb` |  Nullable |
| `section_id` | `uuid` |  Nullable |
| `lesson_type` | `text` |  Nullable |

## Table `assignments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `class_id` | `uuid` |  |
| `lesson_id` | `uuid` |  Nullable |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `type` | `text` |  |
| `deadline` | `timestamptz` |  Nullable |
| `max_score` | `int4` |  Nullable |
| `ai_graded` | `bool` |  Nullable |
| `status` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `is_strict_mode` | `bool` |  Nullable |
| `strict_mode_limit` | `int4` |  Nullable |
| `show_answers` | `bool` |  Nullable |

## Table `questions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `assignment_id` | `uuid` |  |
| `content` | `text` |  |
| `options` | `jsonb` |  Nullable |
| `correct_answer` | `text` |  Nullable |
| `points` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `submissions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `assignment_id` | `uuid` |  |
| `student_id` | `uuid` |  |
| `answers_data` | `jsonb` |  Nullable |
| `content_url` | `text` |  Nullable |
| `score` | `int4` |  Nullable |
| `feedback` | `text` |  Nullable |
| `graded_by` | `uuid` |  Nullable |
| `submitted_at` | `timestamptz` |  |

## Table `class_sections`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `class_id` | `uuid` |  |
| `title` | `text` |  |
| `order` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `course_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `class_id` | `uuid` |  |
| `parent_id` | `uuid` |  Nullable |
| `title` | `text` |  |
| `type` | `text` |  |
| `order_index` | `int4` |  |
| `is_published` | `bool` |  Nullable |
| `unlock_after` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `item_contents`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `item_id` | `uuid` |  Unique |
| `content` | `text` |  Nullable |
| `video_url` | `text` |  Nullable |
| `file_url` | `text` |  Nullable |
| `zoom_link` | `text` |  Nullable |
| `deadline` | `timestamptz` |  Nullable |
| `max_attempts` | `int4` |  Nullable |
| `min_score` | `numeric` |  Nullable |
| `score_method` | `text` |  Nullable |
| `quiz_data` | `jsonb` |  Nullable |

## Table `quiz_questions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `item_id` | `uuid` |  |
| `content` | `text` |  |
| `options` | `jsonb` |  |
| `correct_options` | `jsonb` |  |
| `points` | `numeric` |  Nullable |
| `order_index` | `int4` |  |

## Table `student_progress`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `student_id` | `uuid` |  |
| `item_id` | `uuid` |  |
| `status` | `text` |  |
| `score` | `numeric` |  Nullable |
| `attempts` | `int4` |  Nullable |
| `last_accessed` | `timestamptz` |  Nullable |
| `completed_at` | `timestamptz` |  Nullable |

## Table `quiz_attempts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `student_id` | `uuid` |  |
| `item_id` | `uuid` |  |
| `answers` | `jsonb` |  |
| `score` | `numeric` |  Nullable |
| `started_at` | `timestamptz` |  Nullable |
| `submitted_at` | `timestamptz` |  Nullable |
| `passed` | `bool` |  Nullable |

## Table `rooms`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  Unique |
| `capacity` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `class_schedules`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `class_id` | `uuid` |  |
| `room_id` | `uuid` |  Nullable |
| `day_of_week` | `int4` |  |
| `start_time` | `time` |  |
| `end_time` | `time` |  |
| `created_at` | `timestamptz` |  Nullable |
| `note` | `text` |  Nullable |
| `start_date` | `date` |  Nullable |
| `end_date` | `date` |  Nullable |

## Table `exams`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `class_id` | `uuid` |  Nullable |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `questions` | `jsonb` |  |
| `duration_minutes` | `int4` |  Nullable |
| `total_points` | `int4` |  Nullable |
| `is_published` | `bool` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `due_date` | `timestamptz` |  Nullable |
| `is_strict_mode` | `bool` |  Nullable |
| `strict_mode_limit` | `int4` |  Nullable |
| `show_answers` | `bool` |  Nullable |

## Table `exam_submissions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `exam_id` | `uuid` |  Nullable |
| `student_id` | `uuid` |  Nullable |
| `answers` | `jsonb` |  |
| `score` | `numeric` |  Nullable |
| `total_points` | `numeric` |  Nullable |
| `started_at` | `timestamptz` |  Nullable |
| `submitted_at` | `timestamptz` |  Nullable |
| `time_taken_seconds` | `int4` |  Nullable |
| `ai_insight` | `text` |  Nullable |
| `grading_status` | `text` |  Nullable |

## Table `homework`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `class_id` | `uuid` |  Nullable |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `questions` | `jsonb` |  |
| `total_points` | `int4` |  Nullable |
| `due_date` | `timestamptz` |  Nullable |
| `is_published` | `bool` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `homework_submissions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `homework_id` | `uuid` |  Nullable |
| `student_id` | `uuid` |  Nullable |
| `answers` | `jsonb` |  |
| `score` | `numeric` |  Nullable |
| `feedback` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `submitted_at` | `timestamptz` |  Nullable |
| `graded_at` | `timestamptz` |  Nullable |
| `graded_by` | `uuid` |  Nullable |
| `attempts` | `int4` |  Nullable |
| `attempt_history` | `jsonb` |  Nullable |

## Table `attendance_sessions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `class_id` | `uuid` |  |
| `teacher_id` | `uuid` |  Nullable |
| `session_date` | `date` |  |
| `start_time` | `time` |  Nullable |
| `end_time` | `time` |  Nullable |
| `status` | `text` |  Nullable |
| `note` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `attendance_records`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `session_id` | `uuid` |  |
| `student_id` | `uuid` |  |
| `status` | `text` |  |
| `note` | `text` |  Nullable |
| `marked_by` | `uuid` |  Nullable |
| `marked_at` | `timestamptz` |  Nullable |
| `updated_by` | `uuid` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `absence_requests`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `parent_id` | `uuid` |  |
| `student_id` | `uuid` |  |
| `class_id` | `uuid` |  |
| `absence_date` | `date` |  |
| `reason` | `text` |  |
| `attachment_url` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `reviewed_by` | `uuid` |  Nullable |
| `reviewed_at` | `timestamptz` |  Nullable |
| `reject_reason` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `class_sessions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `class_id` | `uuid` |  |
| `session_number` | `int4` |  |
| `session_date` | `date` |  |
| `start_time` | `time` |  |
| `end_time` | `time` |  |
| `topic` | `text` |  Nullable |
| `description` | `text` |  Nullable |
| `materials_url` | `_text` |  Nullable |
| `homework` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `cancel_reason` | `text` |  Nullable |
| `teacher_notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `substitute_teacher_id` | `uuid` |  Nullable |
| `teaching_status` | `text` |  Nullable |
| `actual_teacher_id` | `uuid` |  Nullable |
| `taught_at` | `timestamptz` |  Nullable |
| `is_makeup` | `bool` |  Nullable |
| `original_session_id` | `uuid` |  Nullable |
| `lesson_title` | `text` |  Nullable |
| `lesson_content` | `text` |  Nullable |
| `attachments` | `jsonb` |  Nullable |

## Table `student_class_stats`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `student_id` | `uuid` |  |
| `class_id` | `uuid` |  |
| `total_sessions` | `int4` |  Nullable |
| `present_count` | `int4` |  Nullable |
| `absent_count` | `int4` |  Nullable |
| `late_count` | `int4` |  Nullable |
| `excused_count` | `int4` |  Nullable |
| `attendance_rate` | `numeric` |  Nullable |
| `avg_score` | `numeric` |  Nullable |
| `attendance_rank` | `int4` |  Nullable |
| `academic_rank` | `int4` |  Nullable |
| `last_updated` | `timestamptz` |  Nullable |

## Table `grade_notifications`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `student_id` | `uuid` |  |
| `parent_id` | `uuid` |  |
| `class_id` | `uuid` |  |
| `type` | `text` |  Nullable |
| `period_label` | `text` |  Nullable |
| `summary_data` | `jsonb` |  Nullable |
| `sent_at` | `timestamptz` |  Nullable |
| `read_at` | `timestamptz` |  Nullable |

## Table `attendance_points`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `student_id` | `uuid` |  Nullable |
| `class_id` | `uuid` |  Nullable |
| `session_id` | `uuid` |  Nullable |
| `points_earned` | `int4` |  |
| `reason` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `student_achievements`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `student_id` | `uuid` |  Nullable |
| `class_id` | `uuid` |  Nullable |
| `achievement_type` | `text` |  |
| `earned_at` | `timestamptz` |  Nullable |

## Table `discussion_messages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `item_id` | `uuid` |  |
| `class_id` | `uuid` |  |
| `user_id` | `uuid` |  |
| `content` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `teacher_resources`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `teacher_id` | `uuid` |  |
| `type` | `text` |  |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `content` | `jsonb` |  Nullable |
| `file_url` | `text` |  Nullable |
| `video_url` | `text` |  Nullable |
| `link_url` | `text` |  Nullable |
| `tags` | `_text` |  Nullable |
| `is_public` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `quiz_class_analysis`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `exam_id` | `uuid` |  Nullable Unique |
| `class_id` | `uuid` |  Nullable |
| `teacher_id` | `uuid` |  Nullable |
| `total_submissions` | `int4` |  Nullable |
| `avg_score` | `numeric` |  Nullable |
| `pass_count` | `int4` |  Nullable |
| `fail_count` | `int4` |  Nullable |
| `strengths` | `_text` |  Nullable |
| `weaknesses` | `_text` |  Nullable |
| `knowledge_gaps` | `jsonb` |  Nullable |
| `question_stats` | `jsonb` |  Nullable |
| `teaching_suggestions` | `_text` |  Nullable |
| `score_distribution` | `jsonb` |  Nullable |
| `ai_summary` | `text` |  Nullable |
| `generated_at` | `timestamp` |  Nullable |
| `status` | `text` |  Nullable |

## Table `quiz_individual_analysis`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `submission_id` | `uuid` |  Nullable Unique |
| `student_id` | `uuid` |  Nullable |
| `exam_id` | `uuid` |  Nullable |
| `knowledge_gaps` | `_text` |  Nullable |
| `wrong_questions` | `jsonb` |  Nullable |
| `ai_feedback` | `text` |  Nullable |
| `improvement_tasks` | `jsonb` |  Nullable |
| `teacher_edited_feedback` | `text` |  Nullable |
| `teacher_edited_tasks` | `jsonb` |  Nullable |
| `status` | `text` |  Nullable |
| `sent_at` | `timestamp` |  Nullable |
| `deadline` | `timestamp` |  Nullable |
| `created_at` | `timestamp` |  Nullable |
| `advancement_suggestion` | `text` |  Nullable |

## Table `improvement_progress`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `analysis_id` | `uuid` |  Nullable |
| `student_id` | `uuid` |  Nullable |
| `task_index` | `int4` |  |
| `status` | `text` |  Nullable |
| `completed_at` | `timestamp` |  Nullable |
| `quiz_score` | `int4` |  Nullable |
| `quiz_total` | `int4` |  Nullable |
| `quiz_answers` | `jsonb` |  Nullable |

## Table `supplementary_quizzes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `analysis_id` | `uuid` |  Nullable |
| `exam_id` | `uuid` |  Nullable |
| `student_id` | `uuid` |  Nullable |
| `teacher_id` | `uuid` |  Nullable |
| `title` | `text` |  |
| `questions` | `jsonb` |  |
| `total_questions` | `int4` |  |
| `student_answers` | `jsonb` |  Nullable |
| `score` | `int4` |  Nullable |
| `status` | `text` |  Nullable |
| `sent_at` | `timestamp` |  Nullable |
| `completed_at` | `timestamp` |  Nullable |
| `created_at` | `timestamp` |  Nullable |

## Table `user_feedback`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Nullable |
| `role` | `text` |  |
| `type` | `text` |  |
| `title` | `text` |  |
| `content` | `text` |  |
| `status` | `text` |  Nullable |
| `admin_reply` | `text` |  Nullable |
| `created_at` | `timestamp` |  Nullable |
| `resolved_at` | `timestamp` |  Nullable |
| `target_teacher_id` | `uuid` |  Nullable |
| `class_id` | `uuid` |  Nullable |

## Table `improvement_quiz_results`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `analysis_id` | `uuid` |  Nullable |
| `student_id` | `uuid` |  Nullable |
| `answers` | `jsonb` |  Nullable |
| `score` | `int4` |  Nullable |
| `total` | `int4` |  Nullable |
| `percentage` | `numeric` |  Nullable |
| `submitted_at` | `timestamp` |  Nullable |

## Table `student_points`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `student_id` | `uuid` |  |
| `class_id` | `uuid` |  |
| `teacher_id` | `uuid` |  |
| `points` | `int2` |  |
| `reason` | `text` |  |
| `type` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `fee_plans`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `class_id` | `uuid` |  Nullable |
| `name` | `text` |  |
| `amount` | `int8` |  |
| `currency` | `text` |  Nullable |
| `due_date` | `date` |  |
| `description` | `text` |  Nullable |
| `is_recurring` | `bool` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `invoices`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `fee_plan_id` | `uuid` |  Nullable |
| `student_id` | `uuid` |  Nullable |
| `class_id` | `uuid` |  Nullable |
| `amount` | `int8` |  |
| `status` | `text` |  Nullable |
| `due_date` | `date` |  |
| `paid_at` | `timestamptz` |  Nullable |
| `pdf_url` | `text` |  Nullable |
| `invoice_number` | `text` |  Nullable Unique |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `payments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `invoice_id` | `uuid` |  Nullable |
| `user_id` | `uuid` |  Nullable |
| `amount` | `int8` |  |
| `currency` | `text` |  Nullable |
| `provider` | `text` |  |
| `provider_txn_id` | `text` |  Nullable Unique |
| `provider_order_id` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `raw_response` | `jsonb` |  Nullable |
| `ip_address` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `fee_schedules`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `class_id` | `uuid` |  Nullable |
| `amount` | `int8` |  |
| `day_of_month` | `int4` |  Nullable |
| `description` | `text` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `teacher_leave_requests`

Đơn xin nghỉ dạy của giáo viên

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `teacher_id` | `uuid` |  |
| `class_id` | `uuid` |  |
| `session_id` | `uuid` |  Nullable |
| `leave_date` | `date` |  |
| `reason` | `text` |  |
| `status` | `text` |  |
| `admin_action` | `text` |  Nullable |
| `substitute_teacher_id` | `uuid` |  Nullable |
| `makeup_session_id` | `uuid` |  Nullable |
| `admin_note` | `text` |  Nullable |
| `reviewed_by` | `uuid` |  Nullable |
| `reviewed_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `student_reviews`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `class_id` | `uuid` |  Nullable |
| `student_id` | `uuid` |  Nullable |
| `teacher_id` | `uuid` |  Nullable |
| `review_type` | `text` |  |
| `review_date` | `date` |  |
| `week_start` | `date` |  Nullable |
| `period_label` | `text` |  Nullable |
| `session_id` | `uuid` |  Nullable |
| `positive_tags` | `_text` |  Nullable |
| `improvement_tags` | `_text` |  Nullable |
| `teacher_comment` | `text` |  Nullable |
| `score_data` | `jsonb` |  Nullable |
| `is_sent` | `bool` |  Nullable |
| `sent_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `announcement_reads`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `announcement_id` | `uuid` |  |
| `user_id` | `uuid` |  |
| `read_at` | `timestamptz` |  Nullable |
| `confirmed_at` | `timestamptz` |  Nullable |

## Table `surveys`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `scope` | `text` |  |
| `course_id` | `uuid` |  Nullable |
| `class_id` | `uuid` |  Nullable |
| `created_by` | `uuid` |  |
| `created_by_role` | `text` |  |
| `is_active` | `bool` |  Nullable |
| `deadline` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `survey_questions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `survey_id` | `uuid` |  |
| `question_text` | `text` |  |
| `question_type` | `text` |  |
| `options` | `jsonb` |  Nullable |
| `is_required` | `bool` |  Nullable |
| `sort_order` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `survey_responses`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `survey_id` | `uuid` |  |
| `question_id` | `uuid` |  |
| `user_id` | `uuid` |  |
| `answer` | `jsonb` |  |
| `submitted_at` | `timestamptz` |  Nullable |

## Table `student_activity_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `student_id` | `uuid` |  |
| `activity_type` | `text` |  |
| `context_type` | `text` |  |
| `context_id` | `text` |  Nullable |
| `class_id` | `uuid` |  Nullable |
| `metadata` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `student_behavior_scores`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `student_id` | `uuid` |  |
| `class_id` | `uuid` |  |
| `period` | `text` |  |
| `avg_answer_speed_ms` | `float8` |  Nullable |
| `tab_switch_count` | `int4` |  Nullable |
| `total_active_time_s` | `int4` |  Nullable |
| `total_idle_time_s` | `int4` |  Nullable |
| `rapid_guess_count` | `int4` |  Nullable |
| `total_sessions` | `int4` |  Nullable |
| `gaming_score` | `float8` |  Nullable |
| `risk_level` | `text` |  Nullable |
| `ai_analysis_json` | `jsonb` |  Nullable |
| `avg_score_recent` | `float8` |  Nullable |
| `score_trend` | `text` |  Nullable |
| `anomaly_detected` | `bool` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `behavior_alerts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `student_id` | `uuid` |  |
| `class_id` | `uuid` |  Nullable |
| `alert_type` | `text` |  |
| `severity` | `text` |  Nullable |
| `description` | `text` |  |
| `details_json` | `jsonb` |  Nullable |
| `is_resolved` | `bool` |  Nullable |
| `notified_teacher` | `bool` |  Nullable |
| `notified_parent` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `student_goals`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `student_id` | `uuid` |  |
| `created_by` | `uuid` |  |
| `created_by_role` | `text` |  |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `target_date` | `date` |  Nullable |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `student_habits`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `student_id` | `uuid` |  |
| `parent_id` | `uuid` |  |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `frequency` | `text` |  |
| `is_active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `student_habit_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `habit_id` | `uuid` |  |
| `student_id` | `uuid` |  |
| `log_date` | `date` |  |
| `completed` | `bool` |  Nullable |
| `completed_at` | `timestamptz` |  Nullable |

## Table `class_ai_reports`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `class_id` | `uuid` |  Nullable Unique |
| `teacher_id` | `uuid` |  Nullable |
| `report_text` | `text` |  |
| `student_count` | `int4` |  Nullable |
| `class_avg` | `numeric` |  Nullable |
| `generated_at` | `timestamptz` |  Nullable |

## RLS Policies

### `rooms`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Cho phép đọc phòng học` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Mọi thao tác quản lý phòng` | ALL | authenticated | PERMISSIVE | `true` | `true` |

### `class_schedules`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Cho phép đọc lịch học` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Mọi thao tác quản lý lịch` | ALL | authenticated | PERMISSIVE | `true` | `true` |

### `attendance_points`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `admin_full_access_points` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))` | — |
| `parents_view_children_points` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM parent_students   WHERE ((parent_students.student_id = attendance_points.student_id) AND (parent_students.parent_id = auth.uid()))))` | — |
| `students_view_own_points` | SELECT | public | PERMISSIVE | `(student_id = auth.uid())` | — |
| `teachers_insert_points` | INSERT | public | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM classes   WHERE ((classes.id = attendance_points.class_id) AND (classes.teacher_id = auth.uid()))))` |
| `teachers_view_class_points` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM classes   WHERE ((classes.id = attendance_points.class_id) AND (classes.teacher_id = auth.uid()))))` | — |

### `student_achievements`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `admin_full_access_achievements` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))` | — |
| `parents_view_children_achievements` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM parent_students   WHERE ((parent_students.student_id = student_achievements.student_id) AND (parent_students.parent_id = auth.uid()))))` | — |
| `students_view_own_achievements` | SELECT | public | PERMISSIVE | `(student_id = auth.uid())` | — |
| `teachers_manage_achievements` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM classes   WHERE ((classes.id = student_achievements.class_id) AND (classes.teacher_id = auth.uid()))))` | — |

### `user_feedback`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `admin_full_access_user_feedback` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))` | — |
| `teacher_update_targeted_feedback` | UPDATE | public | PERMISSIVE | `(target_teacher_id = auth.uid())` | — |
| `teacher_view_targeted_feedback` | SELECT | public | PERMISSIVE | `(target_teacher_id = auth.uid())` | — |
| `user_insert_own_feedback` | INSERT | public | PERMISSIVE | — | `(user_id = auth.uid())` |
| `user_select_own_feedback` | SELECT | public | PERMISSIVE | `(user_id = auth.uid())` | — |

### `fee_plans`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access fee_plans` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))` | — |
| `Parent view fee_plans of children class` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (parent_students ps      JOIN enrollments e ON ((e.student_id = ps.student_id)))   WHERE ((ps.parent_id = auth.uid()) AND (e.class_id = fee_plans.class_id))))` | — |
| `Student view own class fee_plans` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM enrollments e   WHERE ((e.student_id = auth.uid()) AND (e.class_id = fee_plans.class_id))))` | — |

### `invoices`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access invoices` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))` | — |
| `Parent view children invoices` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM parent_students ps   WHERE ((ps.parent_id = auth.uid()) AND (ps.student_id = invoices.student_id))))` | — |
| `Student view own invoices` | SELECT | public | PERMISSIVE | `(student_id = auth.uid())` | — |

### `payments`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access payments` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))` | — |
| `Parent insert payments` | INSERT | public | PERMISSIVE | — | `(user_id = auth.uid())` |
| `Parent view own payments` | SELECT | public | PERMISSIVE | `(user_id = auth.uid())` | — |

### `fee_schedules`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access fee_schedules` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))` | — |

### `announcement_reads`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `admin_full_access_reads` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))` | — |
| `teacher_view_reads` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM announcements   WHERE ((announcements.id = announcement_reads.announcement_id) AND (announcements.teacher_id = auth.uid()))))` | — |
| `user_manage_own_reads` | ALL | public | PERMISSIVE | `(user_id = auth.uid())` | — |

### `improvement_quiz_results`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `admin_full_access_improvement_quiz` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))` | — |
| `student_insert_own_quiz_results` | INSERT | public | PERMISSIVE | — | `(student_id = auth.uid())` |
| `student_select_own_quiz_results` | SELECT | public | PERMISSIVE | `(student_id = auth.uid())` | — |
| `teacher_select_class_quiz_results` | SELECT | public | PERMISSIVE | `((EXISTS ( SELECT 1    FROM users u   WHERE ((u.id = auth.uid()) AND (u.role = 'teacher'::text)))) AND (EXISTS ( SELECT 1    FROM ((quiz_individual_analysis qia      JOIN exams ex ON ((qia.exam_id = ex.id)))      JOIN classes c ON ((ex.class_id = c.id)))   WHERE ((qia.id = improvement_quiz_results.analysis_id) AND (c.teacher_id = auth.uid())))))` | — |

### `surveys`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `admin_full_access_surveys` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))` | — |
| `teacher_manage_own_surveys` | ALL | public | PERMISSIVE | `(created_by = auth.uid())` | — |
| `users_view_active_surveys` | SELECT | public | PERMISSIVE | `(is_active = true)` | — |

### `survey_questions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `admin_full_access_survey_questions` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))` | — |
| `teacher_manage_own_questions` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM surveys   WHERE ((surveys.id = survey_questions.survey_id) AND (surveys.created_by = auth.uid()))))` | — |
| `users_view_active_questions` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM surveys   WHERE ((surveys.id = survey_questions.survey_id) AND (surveys.is_active = true))))` | — |

### `survey_responses`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `admin_full_access_responses` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))` | — |
| `teacher_view_own_survey_responses` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM surveys   WHERE ((surveys.id = survey_responses.survey_id) AND (surveys.created_by = auth.uid()))))` | — |
| `users_manage_own_responses` | ALL | public | PERMISSIVE | `(user_id = auth.uid())` | — |

### `attendance_sessions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access attendance_sessions` | ALL | public | PERMISSIVE | `(((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text)` | — |
| `Parent read child class sessions` | SELECT | public | PERMISSIVE | `(class_id IN ( SELECT e.class_id    FROM (enrollments e      JOIN parent_students psl ON ((psl.student_id = e.student_id)))   WHERE (psl.parent_id = auth.uid())))` | — |
| `Student read own class sessions` | SELECT | public | PERMISSIVE | `(class_id IN ( SELECT enrollments.class_id    FROM enrollments   WHERE (enrollments.student_id = auth.uid())))` | — |
| `Teacher manage own class sessions` | ALL | public | PERMISSIVE | `((teacher_id = auth.uid()) OR (class_id IN ( SELECT classes.id    FROM classes   WHERE (classes.teacher_id = auth.uid()))))` | — |

### `attendance_records`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access attendance_records` | ALL | public | PERMISSIVE | `(((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text)` | — |
| `Parent read child records` | SELECT | public | PERMISSIVE | `(student_id IN ( SELECT parent_students.student_id    FROM parent_students   WHERE (parent_students.parent_id = auth.uid())))` | — |
| `Student read own records` | SELECT | public | PERMISSIVE | `(student_id = auth.uid())` | — |
| `Teacher manage own class records` | ALL | public | PERMISSIVE | `(session_id IN ( SELECT attendance_sessions.id    FROM attendance_sessions   WHERE ((attendance_sessions.teacher_id = auth.uid()) OR (attendance_sessions.class_id IN ( SELECT classes.id            FROM classes           WHERE (classes.teacher_id = auth.uid()))))))` | — |

### `absence_requests`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access absence_requests` | ALL | public | PERMISSIVE | `(((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text)` | — |
| `Parent manage own absence_requests` | ALL | public | PERMISSIVE | `(parent_id = auth.uid())` | — |
| `Student view own absence_requests` | SELECT | public | PERMISSIVE | `(student_id = auth.uid())` | — |
| `Teacher view and review absence_requests` | ALL | public | PERMISSIVE | `(class_id IN ( SELECT classes.id    FROM classes   WHERE (classes.teacher_id = auth.uid())))` | — |

### `discussion_messages`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Cho phép đọc mọi tin nhắn nếu login` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Mọi INSERT qua Server Action` | ALL | authenticated | PERMISSIVE | `true` | `true` |

### `questions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin can full access questions` | ALL | authenticated | PERMISSIVE | `(( SELECT users.role    FROM users   WHERE (users.id = auth.uid())) = 'admin'::text)` | — |
| `Student can view questions` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM assignments a   WHERE ((a.id = questions.assignment_id) AND (a.status <> 'draft'::text) AND is_student_in_class(a.class_id))))` | — |
| `Teacher can manage questions` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM assignments a   WHERE ((a.id = questions.assignment_id) AND is_teacher_of_class(a.class_id))))` | — |

### `submissions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin can full access submissions` | ALL | authenticated | PERMISSIVE | `(( SELECT users.role    FROM users   WHERE (users.id = auth.uid())) = 'admin'::text)` | — |
| `Student can submit own assignments` | INSERT | authenticated | PERMISSIVE | — | `((student_id = auth.uid()) AND (EXISTS ( SELECT 1    FROM assignments a   WHERE ((a.id = submissions.assignment_id) AND (a.status = 'published'::text) AND is_student_in_class(a.class_id) AND ((a.deadline IS NULL) OR (a.deadline > now()))))))` |
| `Student can view own submissions` | SELECT | authenticated | PERMISSIVE | `(student_id = auth.uid())` | — |
| `Teacher can grade submissions` | ALL | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM assignments a   WHERE ((a.id = submissions.assignment_id) AND is_teacher_of_class(a.class_id))))` | — |

### `lessons`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin can full access lessons` | ALL | authenticated | PERMISSIVE | `(( SELECT users.role    FROM users   WHERE (users.id = auth.uid())) = 'admin'::text)` | — |
| `Student can view published lessons` | SELECT | authenticated | PERMISSIVE | `((published_at IS NOT NULL) AND is_student_in_class(class_id))` | — |
| `Teacher can manage their lessons` | ALL | authenticated | PERMISSIVE | `is_teacher_of_class(class_id)` | — |

### `assignments`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin can full access assignments` | ALL | authenticated | PERMISSIVE | `(( SELECT users.role    FROM users   WHERE (users.id = auth.uid())) = 'admin'::text)` | — |
| `Student can view published assignments` | SELECT | authenticated | PERMISSIVE | `((status <> 'draft'::text) AND is_student_in_class(class_id))` | — |
| `Teacher can manage assignments` | ALL | authenticated | PERMISSIVE | `is_teacher_of_class(class_id)` | — |

### `users`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on users` | ALL | public | PERMISSIVE | `(((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text)` | `(((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text)` |
| `Teachers can read all users` | SELECT | public | PERMISSIVE | `(((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'teacher'::text)` | — |
| `Users can read own profile` | SELECT | public | PERMISSIVE | `(id = auth.uid())` | — |
| `admin_full_access` | ALL | public | PERMISSIVE | `(get_user_role() = 'admin'::text)` | — |
| `parent_read_students` | SELECT | public | PERMISSIVE | `((get_user_role() = 'parent'::text) AND (id IN ( SELECT parent_students.student_id    FROM parent_students   WHERE (parent_students.parent_id = auth.uid()))))` | — |
| `users_read_own` | SELECT | public | PERMISSIVE | `(id = auth.uid())` | — |

### `parent_students`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `admin_full_access` | ALL | public | PERMISSIVE | `(get_user_role() = 'admin'::text)` | — |
| `parent_read_own_link` | SELECT | public | PERMISSIVE | `(parent_id = auth.uid())` | — |

### `classes`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on classes` | ALL | public | PERMISSIVE | `(((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text)` | `(((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text)` |
| `Admin full classes` | ALL | public | PERMISSIVE | `(((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text)` | — |
| `Student read own classes` | SELECT | authenticated | PERMISSIVE | `is_student_in_class(id)` | — |
| `Teacher read own classes` | SELECT | authenticated | PERMISSIVE | `(teacher_id = auth.uid())` | — |
| `Teachers can read own classes` | SELECT | public | PERMISSIVE | `(teacher_id = auth.uid())` | — |
| `admin_full_access` | ALL | public | PERMISSIVE | `(get_user_role() = 'admin'::text)` | — |
| `student_read_classes` | SELECT | public | PERMISSIVE | `((get_user_role() = 'student'::text) AND (id IN ( SELECT enrollments.class_id    FROM enrollments   WHERE (enrollments.student_id = auth.uid()))))` | — |
| `teacher_read_classes` | SELECT | public | PERMISSIVE | `((get_user_role() = 'teacher'::text) AND (teacher_id = auth.uid()))` | — |

### `enrollments`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on enrollments` | ALL | public | PERMISSIVE | `(((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text)` | `(((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text)` |
| `Admin full enrollments` | ALL | public | PERMISSIVE | `(((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text)` | — |
| `Student read own enrollments` | SELECT | authenticated | PERMISSIVE | `(student_id = auth.uid())` | — |
| `Students can read own enrollments` | SELECT | public | PERMISSIVE | `(student_id = auth.uid())` | — |
| `Teacher read class enrollments` | SELECT | authenticated | PERMISSIVE | `is_teacher_of_class(class_id)` | — |
| `Teachers can read class enrollments` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM classes c   WHERE ((c.id = enrollments.class_id) AND (c.teacher_id = auth.uid()))))` | — |
| `admin_full_access` | ALL | public | PERMISSIVE | `(get_user_role() = 'admin'::text)` | — |
| `student_read_enrollments` | SELECT | public | PERMISSIVE | `((get_user_role() = 'student'::text) AND (student_id = auth.uid()))` | — |
| `teacher_read_enrollments` | SELECT | public | PERMISSIVE | `((get_user_role() = 'teacher'::text) AND (class_id IN ( SELECT classes.id    FROM classes   WHERE (classes.teacher_id = auth.uid()))))` | — |

### `courses`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on courses` | ALL | public | PERMISSIVE | `(((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text)` | `(((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text)` |
| `Admin full courses` | ALL | public | PERMISSIVE | `(((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text)` | — |
| `Teacher read courses` | SELECT | public | PERMISSIVE | `(((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'teacher'::text)` | — |
| `Teachers can read courses` | SELECT | public | PERMISSIVE | `(((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'teacher'::text)` | — |
| `admin_full_access` | ALL | public | PERMISSIVE | `(get_user_role() = 'admin'::text)` | — |

### `notifications`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `admin_full_access` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))` | — |
| `notifications_own` | ALL | public | PERMISSIVE | `(user_id = auth.uid())` | — |
| `user_read_own_notifications` | SELECT | public | PERMISSIVE | `(user_id = auth.uid())` | — |
| `user_update_own_notifications` | UPDATE | public | PERMISSIVE | `(user_id = auth.uid())` | — |

### `profiles`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `admin_full_access` | ALL | public | PERMISSIVE | `(get_user_role() = 'admin'::text)` | — |
| `profiles_insert_own` | INSERT | public | PERMISSIVE | — | `(user_id = auth.uid())` |
| `profiles_read_own` | SELECT | public | PERMISSIVE | `(user_id = auth.uid())` | — |
| `profiles_update_own` | UPDATE | public | PERMISSIVE | `(user_id = auth.uid())` | — |

### `announcements`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `admin_full_access` | ALL | public | PERMISSIVE | `(get_user_role() = 'admin'::text)` | — |
| `admin_manage_announcements` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))` | — |
| `parent_view_class_announcements` | SELECT | authenticated | PERMISSIVE | `((EXISTS ( SELECT 1    FROM (parent_students ps      JOIN enrollments e ON ((e.student_id = ps.student_id)))   WHERE ((ps.parent_id = auth.uid()) AND (e.class_id = announcements.class_id)))) AND ('parent'::text = ANY (target_roles)))` | — |
| `student_read_announcements` | SELECT | public | PERMISSIVE | `((get_user_role() = 'student'::text) AND (class_id IN ( SELECT enrollments.class_id    FROM enrollments   WHERE (enrollments.student_id = auth.uid()))))` | — |
| `teacher_manage_announcements` | ALL | public | PERMISSIVE | `((get_user_role() = 'teacher'::text) AND (teacher_id = auth.uid()))` | — |

### `feedback`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `admin_full_access` | ALL | public | PERMISSIVE | `(get_user_role() = 'admin'::text)` | — |
| `parent_manage_feedback` | ALL | public | PERMISSIVE | `((get_user_role() = 'parent'::text) AND (parent_id = auth.uid()))` | — |

### `leave_requests`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `admin_full_access` | ALL | public | PERMISSIVE | `(get_user_role() = 'admin'::text)` | — |
| `parent_manage_leave_requests` | ALL | public | PERMISSIVE | `((get_user_role() = 'parent'::text) AND (parent_id = auth.uid()))` | — |

### `ai_analyses`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `admin_full_access` | ALL | public | PERMISSIVE | `(get_user_role() = 'admin'::text)` | — |

### `grade_reports`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `admin_full_access` | ALL | public | PERMISSIVE | `(get_user_role() = 'admin'::text)` | — |
| `parent_read_grade_reports` | SELECT | public | PERMISSIVE | `((get_user_role() = 'parent'::text) AND (student_id IN ( SELECT parent_students.student_id    FROM parent_students   WHERE (parent_students.parent_id = auth.uid()))))` | — |
| `student_read_grade_reports` | SELECT | public | PERMISSIVE | `((get_user_role() = 'student'::text) AND (student_id = auth.uid()))` | — |

### `attendance`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access on attendance` | ALL | public | PERMISSIVE | `(((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text)` | `(((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text)` |
| `Admin full attendance` | ALL | public | PERMISSIVE | `(((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text)` | — |
| `Student read own attendance` | SELECT | public | PERMISSIVE | `(student_id = auth.uid())` | — |
| `Students can read own attendance` | SELECT | public | PERMISSIVE | `(student_id = auth.uid())` | — |
| `Teacher manage class attendance` | ALL | public | PERMISSIVE | `(class_id IN ( SELECT classes.id    FROM classes   WHERE (classes.teacher_id = auth.uid())))` | — |
| `Teachers can manage attendance for own classes` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM classes c   WHERE ((c.id = attendance.class_id) AND (c.teacher_id = auth.uid()))))` | `(EXISTS ( SELECT 1    FROM classes c   WHERE ((c.id = attendance.class_id) AND (c.teacher_id = auth.uid()))))` |
| `admin_full_access` | ALL | public | PERMISSIVE | `(get_user_role() = 'admin'::text)` | — |
| `parent_read_attendance` | SELECT | public | PERMISSIVE | `((get_user_role() = 'parent'::text) AND (student_id IN ( SELECT parent_students.student_id    FROM parent_students   WHERE (parent_students.parent_id = auth.uid()))))` | — |
| `student_read_attendance` | SELECT | public | PERMISSIVE | `((get_user_role() = 'student'::text) AND (student_id = auth.uid()))` | — |
| `teacher_manage_attendance` | ALL | public | PERMISSIVE | `((get_user_role() = 'teacher'::text) AND (class_id IN ( SELECT classes.id    FROM classes   WHERE (classes.teacher_id = auth.uid()))))` | — |

### `class_sections`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Users có thể xem class_sections` | SELECT | authenticated | PERMISSIVE | `true` | — |

### `student_progress`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Cho phép đọc tiến độ của bản thân` | SELECT | authenticated | PERMISSIVE | `((auth.uid() = student_id) OR true)` | — |
| `Học sinh ghi tiến độ progress` | ALL | authenticated | PERMISSIVE | `true` | `true` |

### `quiz_attempts`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Cho phép đọc bài làm của bản thân` | SELECT | authenticated | PERMISSIVE | `((auth.uid() = student_id) OR true)` | — |
| `Học Sinh ghi lịch sử attempt` | ALL | authenticated | PERMISSIVE | `true` | `true` |

### `item_contents`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Cho phép đọc mọi content ở frontend nếu login` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Mọi INSERT qua Server Action` | ALL | authenticated | PERMISSIVE | `true` | `true` |

### `quiz_questions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Cho phép đọc mọi câu hỏi ở frontend nếu login` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Mọi INSERT qua Server Action` | ALL | authenticated | PERMISSIVE | `true` | `true` |

### `student_class_stats`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access student_class_stats` | ALL | public | PERMISSIVE | `(((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text)` | — |
| `Parent read child stats` | SELECT | public | PERMISSIVE | `(student_id IN ( SELECT parent_students.student_id    FROM parent_students   WHERE (parent_students.parent_id = auth.uid())))` | — |
| `Student read own stats` | SELECT | public | PERMISSIVE | `(student_id = auth.uid())` | — |
| `Teacher read own stats` | SELECT | public | PERMISSIVE | `(class_id IN ( SELECT classes.id    FROM classes   WHERE (classes.teacher_id = auth.uid())))` | — |

### `grade_notifications`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access grade_notifications` | ALL | public | PERMISSIVE | `(((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text)` | — |
| `Parent read own grade_notifications` | SELECT | public | PERMISSIVE | `(parent_id = auth.uid())` | — |
| `Student read own grade_notifications` | SELECT | public | PERMISSIVE | `(student_id = auth.uid())` | — |
| `Teacher create grade_notifications` | INSERT | public | PERMISSIVE | — | `(class_id IN ( SELECT classes.id    FROM classes   WHERE (classes.teacher_id = auth.uid())))` |
| `Teacher read grade_notifications` | SELECT | public | PERMISSIVE | `(class_id IN ( SELECT classes.id    FROM classes   WHERE (classes.teacher_id = auth.uid())))` | — |

### `course_items`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Cho phép đọc mọi thứ ở frontend nếu login` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Mọi INSERT qua Server Action` | ALL | authenticated | PERMISSIVE | `true` | `true` |

### `student_points`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admins have full access to student_points` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))` | — |
| `Parents can view their children's points` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM parent_students   WHERE ((parent_students.student_id = student_points.student_id) AND (parent_students.parent_id = auth.uid()))))` | — |
| `Students can view their own points` | SELECT | public | PERMISSIVE | `(student_id = auth.uid())` | — |
| `Teachers can manage points for their classes` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM classes   WHERE ((classes.id = student_points.class_id) AND (classes.teacher_id = auth.uid()))))` | — |

### `student_activity_logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `admin_full_access_activity_logs` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))` | — |
| `student_insert_own_logs` | INSERT | public | PERMISSIVE | — | `(student_id = auth.uid())` |
| `student_read_own_logs` | SELECT | public | PERMISSIVE | `(student_id = auth.uid())` | — |
| `teacher_read_activity_logs` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM classes c   WHERE ((c.id = student_activity_logs.class_id) AND (c.teacher_id = auth.uid()))))` | — |

### `student_behavior_scores`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `admin_full_access_behavior_scores` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))` | — |
| `parent_read_child_scores` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM parent_students ps   WHERE ((ps.student_id = student_behavior_scores.student_id) AND (ps.parent_id = auth.uid()))))` | — |
| `teacher_read_behavior_scores` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM classes c   WHERE ((c.id = student_behavior_scores.class_id) AND (c.teacher_id = auth.uid()))))` | — |

### `behavior_alerts`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `admin_full_access_behavior_alerts` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))` | — |
| `parent_read_child_alerts` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM parent_students ps   WHERE ((ps.student_id = behavior_alerts.student_id) AND (ps.parent_id = auth.uid()))))` | — |
| `teacher_read_behavior_alerts` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM classes c   WHERE ((c.id = behavior_alerts.class_id) AND (c.teacher_id = auth.uid()))))` | — |

### `class_ai_reports`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Teachers can manage their own class AI reports` | ALL | public | PERMISSIVE | `true` | `true` |

### `student_goals`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Service role full access goals` | ALL | public | PERMISSIVE | `true` | `true` |

### `student_habits`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Service role full access habits` | ALL | public | PERMISSIVE | `true` | `true` |

### `student_habit_logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Service role full access habit_logs` | ALL | public | PERMISSIVE | `true` | `true` |

### `teacher_leave_requests`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `admin_full_access_teacher_leave` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))` | — |
| `teacher_delete_own_pending_leave` | DELETE | public | PERMISSIVE | `((teacher_id = auth.uid()) AND (status = 'pending'::text))` | — |
| `teacher_insert_own_leave` | INSERT | public | PERMISSIVE | — | `(teacher_id = auth.uid())` |
| `teacher_read_own_leave` | SELECT | public | PERMISSIVE | `(teacher_id = auth.uid())` | — |

### `class_sessions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Admin full access class_sessions` | ALL | public | PERMISSIVE | `(((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text)` | — |
| `Parent read child class sessions` | SELECT | public | PERMISSIVE | `(class_id IN ( SELECT e.class_id    FROM (enrollments e      JOIN parent_students psl ON ((psl.student_id = e.student_id)))   WHERE (psl.parent_id = auth.uid())))` | — |
| `Student read own class sessions` | SELECT | public | PERMISSIVE | `(class_id IN ( SELECT enrollments.class_id    FROM enrollments   WHERE (enrollments.student_id = auth.uid())))` | — |
| `Teacher manage own class sessions` | ALL | public | PERMISSIVE | `(class_id IN ( SELECT classes.id    FROM classes   WHERE (classes.teacher_id = auth.uid())))` | — |

### `student_reviews`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `admin_full_access_reviews` | ALL | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM users   WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))` | — |
| `parents_view_children_reviews` | SELECT | public | PERMISSIVE | `((is_sent = true) AND (EXISTS ( SELECT 1    FROM parent_students   WHERE ((parent_students.student_id = student_reviews.student_id) AND (parent_students.parent_id = auth.uid())))))` | — |
| `students_view_own_reviews` | SELECT | public | PERMISSIVE | `((student_id = auth.uid()) AND (is_sent = true))` | — |
| `teachers_manage_reviews` | ALL | public | PERMISSIVE | `((teacher_id = auth.uid()) OR (EXISTS ( SELECT 1    FROM classes   WHERE ((classes.id = student_reviews.class_id) AND (classes.teacher_id = auth.uid())))))` | — |

