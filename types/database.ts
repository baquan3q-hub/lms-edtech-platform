// ============================================================
// Database Type Definitions — E-Learning Platform
// Đảm bảo Type-safety cho toàn dự án
// ============================================================

export type UserRole = "super_admin" | "admin" | "teacher" | "student" | "parent";

export interface School {
    id: string;
    code: string;
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    status: "active" | "inactive" | "archived";
    ai_enabled: boolean;
    api_key?: string | null;
    webhook_url?: string | null;
    created_at: string;
    updated_at: string;
}
export type EnrollmentStatus = "active" | "dropped" | "completed";
export type AssignmentType = "homework" | "quiz" | "exam";
export type AttendanceStatus = "present" | "absent" | "late" | "excused";
export type NotificationType = "info" | "warning" | "success" | "error";
export type FeedbackType = "general" | "complaint" | "suggestion" | "praise";
export type FeedbackStatus = "pending" | "reviewed" | "resolved";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type PaymentProvider = "stripe" | "vnpay";
export type LeaveRequestStatus = "pending" | "approved" | "rejected";
export type AIAnalysisType = "grade_analysis" | "churn_prediction" | "performance_report";

// ============================================================
// 1. CORE
// ============================================================

export interface User {
    id: string;
    email: string;
    role: UserRole;
    full_name: string;
    phone: string | null;
    avatar_url: string | null;
    created_at: string;
}

export interface Profile {
    id: string;
    user_id: string;
    bio: string | null;
    date_of_birth: string | null;
    address: string | null;
    created_at: string;
}

export interface ParentStudent {
    id: string;
    parent_id: string;
    student_id: string;
    created_at: string;
}

// ============================================================
// 2. ACADEMIC
// ============================================================

export interface Course {
    id: string;
    name: string;
    description: string | null;
    teacher_id: string;
    created_at: string;
}

export interface Class {
    id: string;
    course_id: string;
    teacher_id: string;
    name?: string | null;
    room: string | null;
    schedule: Record<string, unknown> | null; // JSONB — lịch học
    max_students: number;
    created_at: string;
    status?: string;
    school_id?: string | null;
    term_id?: string | null;
    subject_id?: string | null;
    homeroom_id?: string | null;
}

// ============================================================
// 2.1 K12 ACADEMIC CATALOG & ROSTERS (PHASE 2)
// ============================================================

export interface AcademicYear {
    id: string;
    school_id: string;
    code: string;
    name: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
    status: 'active' | 'upcoming' | 'archived';
    created_at: string;
    updated_at: string;
}

export interface Term {
    id: string;
    school_id: string;
    academic_year_id: string;
    code: string;
    name: string;
    semester_order: number;
    start_date: string;
    end_date: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface GradeLevel {
    id: string;
    school_id: string;
    level: number;
    code: string;
    name: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Subject {
    id: string;
    school_id: string;
    code: string;
    name: string;
    department?: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Homeroom {
    id: string;
    school_id: string;
    academic_year_id: string;
    grade_level_id: string;
    code: string;
    name: string;
    room?: string | null;
    status: 'active' | 'archived';
    created_at: string;
    updated_at: string;
}

export interface HomeroomEnrollment {
    id: string;
    school_id: string;
    homeroom_id: string;
    student_id: string;
    academic_year_id: string;
    start_date: string;
    end_date?: string | null;
    status: 'active' | 'transferred' | 'graduated' | 'withdrawn';
    created_at: string;
    updated_at: string;
}

export interface HomeroomTeacherAssignment {
    id: string;
    school_id: string;
    homeroom_id: string;
    teacher_id: string;
    academic_year_id: string;
    role: 'head_teacher' | 'assistant';
    start_date: string;
    end_date?: string | null;
    status: 'active' | 'former';
    created_at: string;
    updated_at: string;
}

export interface ClassTeacherAssignment {
    id: string;
    school_id: string;
    class_id: string;
    teacher_id: string;
    role: 'primary_teacher' | 'co_teacher' | 'assistant';
    valid_from: string;
    valid_to?: string | null;
    status: 'active' | 'ended';
    created_at: string;
    updated_at: string;
}

export interface RoleAssignment {
    id: string;
    school_id: string;
    user_id: string;
    role: 'admin' | 'head_teacher' | 'subject_teacher' | 'student' | 'parent';
    scope_type: 'school' | 'homeroom' | 'class' | 'subject';
    scope_id?: string | null;
    valid_from: string;
    valid_to?: string | null;
    status: 'active' | 'revoked';
    created_at: string;
    updated_at: string;
}

// ============================================================
// 2.2 K12 IDENTITY & ONBOARDING (PHASE 3)
// ============================================================

export interface StudentIdentifier {
    id: string;
    school_id: string;
    user_id: string;
    student_code: string;
    status: 'active' | 'inactive' | 'transferred' | 'graduated';
    created_at: string;
    updated_at: string;
}

export interface GuardianIdentifier {
    id: string;
    school_id: string;
    user_id: string;
    guardian_code: string;
    phone?: string | null;
    email?: string | null;
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
}

export interface AccountActivation {
    id: string;
    school_id: string;
    user_id: string;
    activation_token_hash: string;
    expires_at: string;
    attempts_count: number;
    max_attempts: number;
    status: 'pending' | 'used' | 'expired' | 'revoked';
    activated_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface ImportJob {
    id: string;
    school_id: string;
    actor_id: string;
    file_name: string;
    file_hash: string;
    total_rows: number;
    processed_rows: number;
    error_rows: number;
    status: 'uploaded' | 'validating' | 'validated' | 'committing' | 'completed' | 'failed';
    summary?: Record<string, unknown> | null;
    created_at: string;
    finished_at?: string | null;
}

export interface ImportRow {
    id: string;
    job_id: string;
    row_number: number;
    raw_data: Record<string, unknown>;
    normalized_data?: Record<string, unknown> | null;
    status: 'pending' | 'valid' | 'error' | 'committed';
    error_code?: string | null;
    error_message?: string | null;
    created_at: string;
}

// ============================================================
// 2.3 K12 LEARNING & PUBLICATION (PHASE 4)
// ============================================================

export type ExamPublicationStatus = 'draft' | 'published' | 'closed';
export type GradingStatus = 'ungraded' | 'draft' | 'published' | 'locked' | 'pending' | 'graded';

export interface Rubric {
    id: string;
    school_id: string;
    title: string;
    description?: string | null;
    total_points: number;
    created_by?: string | null;
    created_at: string;
    updated_at: string;
}

export interface RubricCriterion {
    id: string;
    rubric_id: string;
    title: string;
    description?: string | null;
    max_points: number;
    order_index: number;
    created_at: string;
}

export interface ScoreAdjustment {
    id: string;
    school_id: string;
    submission_type: 'exam' | 'homework';
    submission_id: string;
    actor_id: string;
    old_score: number | null;
    new_score: number;
    reason: string;
    rubric_breakdown?: Record<string, unknown> | null;
    created_at: string;
}

// ============================================================
// 2.4 K12 ATTENDANCE & INTERVENTIONS (PHASE 5)
// ============================================================

export interface AttendancePolicy {
    id: string;
    school_id: string;
    term_id?: string | null;
    late_threshold_minutes: number;
    absence_warning_count: number;
    grade_drop_threshold: number;
    created_at: string;
    updated_at: string;
}

export interface AbsenceRequestK12 {
    id: string;
    school_id?: string | null;
    term_id?: string | null;
    parent_id: string;
    student_id: string;
    class_id: string;
    absence_date: string;
    reason: string;
    attachment_url?: string | null;
    evidence_url?: string | null;
    status: 'pending' | 'approved' | 'rejected';
    reviewed_by?: string | null;
    reviewed_at?: string | null;
    review_note?: string | null;
    reject_reason?: string | null;
    created_at: string;
}

export interface InterventionCase {
    id: string;
    school_id: string;
    student_id: string;
    homeroom_id?: string | null;
    class_id?: string | null;
    case_type: 'attendance' | 'academic' | 'behavior' | 'other';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    evidence: Record<string, unknown>;
    assigned_to?: string | null;
    review_deadline?: string | null;
    resolution_summary?: string | null;
    closed_by?: string | null;
    closed_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface InterventionAction {
    id: string;
    case_id: string;
    actor_id: string;
    action_type: 'parent_contact' | 'counseling' | 'tutoring' | 'review_note' | 'status_change';
    note: string;
    outcome?: string | null;
    created_at: string;
}

// ============================================================
// 2.5 K12 AI GOVERNANCE & CONTROLLED SCOPE (PHASE 6)
// ============================================================

export type AiJobKind =
    | 'question_generation'
    | 'rubric_grading_feedback'
    | 'early_intervention_recommendation'
    | 'individual'
    | 'class';

export type AiJobStatus = 'queued' | 'running' | 'ready' | 'failed' | 'circuit_broken';
export type AiReviewStatus = 'draft' | 'approved' | 'rejected';

export interface SchoolAiQuota {
    id: string;
    school_id: string;
    month: string; // YYYY-MM-01
    token_quota: number;
    tokens_used: number;
    job_count: number;
    max_parallel_jobs: number;
    created_at: string;
    updated_at: string;
}

export interface LearningAiJob {
    id: string;
    school_id: string;
    requested_by: string;
    kind: AiJobKind;
    target_type?: string | null;
    target_id?: string | null;
    exam_id?: string | null;
    submission_id?: string | null;
    homework_id?: string | null;
    intervention_case_id?: string | null;
    source_data_hash: string;
    prompt_version: string;
    model_name: string;
    status: AiJobStatus;
    review_status: AiReviewStatus;
    reviewer_id?: string | null;
    reviewed_at?: string | null;
    review_note?: string | null;
    raw_output?: Record<string, unknown> | null;
    approved_payload?: Record<string, unknown> | null;
    estimated_tokens: number;
    actual_tokens: number;
    estimated_cost: number;
    actual_cost: number;
    error_code?: string | null;
    error_message?: string | null;
    attempts: number;
    available_at: string;
    locked_at?: string | null;
    created_at: string;
    finished_at?: string | null;
}

export interface Enrollment {
    id: string;
    student_id: string;
    class_id: string;
    enrolled_at: string;
    status: EnrollmentStatus;
}

// ============================================================
// 3. CONTENT
// ============================================================

export interface Lesson {
    id: string;
    class_id: string;
    title: string;
    content: string | null;
    video_url: string | null;
    order: number;
    published_at: string | null;
    created_at: string;
}

export interface Assignment {
    id: string;
    lesson_id: string;
    title: string;
    type: AssignmentType;
    deadline: string | null;
    max_score: number;
    ai_graded: boolean;
    is_strict_mode: boolean;
    strict_mode_limit: number | null;
    show_answers: boolean;
    created_at: string;
}

export interface Question {
    id: string;
    assignment_id: string;
    content: string;
    options: Record<string, unknown> | null; // JSONB — lựa chọn trắc nghiệm
    correct_answer: string | null;
    points: number;
    created_at: string;
}

// ============================================================
// 4. STUDENT ACTIVITY
// ============================================================

export interface Submission {
    id: string;
    student_id: string;
    assignment_id: string;
    content_url: string | null;
    score: number | null;
    submitted_at: string;
    graded_at: string | null;
}

export interface Attendance {
    id: string;
    student_id: string;
    class_id: string;
    date: string;
    status: AttendanceStatus;
    note: string | null;
    created_at: string;
}

// ============================================================
// 5. COMMUNICATION
// ============================================================

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string | null;
    type: NotificationType;
    read: boolean;
    created_at: string;
}

export interface Announcement {
    id: string;
    class_id: string;
    teacher_id: string;
    title: string;
    content: string | null;
    resource_id: string | null;
    resource_type: string | null;
    file_url: string | null;
    video_url: string | null;
    link_url: string | null;
    quiz_data: Record<string, unknown> | null;
    created_at: string;
}

export interface Feedback {
    id: string;
    parent_id: string;
    content: string;
    type: FeedbackType;
    status: FeedbackStatus;
    created_at: string;
}

export interface LeaveRequest {
    id: string;
    student_id: string;
    parent_id: string;
    class_id: string;
    start_date: string;
    end_date: string;
    reason: string | null;
    status: LeaveRequestStatus;
    created_at: string;
}

// ============================================================
// 6. FINANCIAL
// ============================================================

export interface Payment {
    id: string;
    user_id: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    provider: PaymentProvider | null;
    provider_payment_id: string | null;
    created_at: string;
}

export interface Invoice {
    id: string;
    payment_id: string;
    pdf_url: string | null;
    issued_at: string;
}

// ============================================================
// 7. AI
// ============================================================

export interface AIAnalysis {
    id: string;
    student_id: string;
    type: AIAnalysisType;
    result_json: Record<string, unknown> | null;
    created_at: string;
}

export interface GradeReport {
    id: string;
    student_id: string;
    class_id: string;
    period: string;
    report_json: Record<string, unknown> | null;
    sent_at: string | null;
}

export interface StudentPoint {
    id: string;
    student_id: string;
    class_id: string;
    teacher_id: string;
    points: number;
    reason: string;
    type: 'attendance' | 'participation' | 'behavior' | 'homework' | 'other';
    created_at: string;
}

// ============================================================
// 8. AI QUIZ ANALYSIS
// ============================================================

export interface QuizClassAnalysis {
    id: string;
    exam_id: string;
    class_id: string;
    teacher_id: string;
    total_submissions: number;
    avg_score: number;
    pass_count: number;
    fail_count: number;
    strengths: string[];
    weaknesses: string[];
    knowledge_gaps: any[];
    question_stats: any;
    teaching_suggestions: string[];
    score_distribution: Record<string, number>;
    ai_summary: string | null;
    generated_at: string;
    status: 'draft' | 'reviewed' | 'sent';
}

export interface QuizIndividualAnalysis {
    id: string;
    submission_id: string;
    student_id: string;
    exam_id: string;
    knowledge_gaps: string[];
    wrong_questions: any[];
    ai_feedback: string | null;
    improvement_tasks: any[];
    teacher_edited_feedback: string | null;
    teacher_edited_tasks: any[] | null;
    status: 'ai_draft' | 'approved' | 'edited' | 'sent';
    sent_at: string | null;
    deadline: string | null;
    created_at: string;
}

export interface ImprovementProgress {
    id: string;
    analysis_id: string;
    student_id: string;
    task_index: number;
    status: 'pending' | 'in_progress' | 'completed';
    quiz_score: number | null;
    quiz_total: number | null;
    quiz_answers: Record<string, string> | null;
    completed_at: string | null;
}

export interface SupplementaryQuiz {
    id: string;
    analysis_id: string;
    exam_id: string;
    student_id: string;
    teacher_id: string;
    title: string;
    questions: any[];
    total_questions: number;
    student_answers: Record<string, string> | null;
    score: number | null;
    status: 'pending' | 'completed';
    sent_at: string;
    completed_at: string | null;
    created_at: string;
}

// ============================================================
// Supabase Database type (dùng cho generic type parameter)
// ============================================================

export interface Database {
    public: {
        Tables: {
            users: { Row: User; Insert: Omit<User, "id" | "created_at">; Update: Partial<Omit<User, "id">> };
            profiles: { Row: Profile; Insert: Omit<Profile, "id" | "created_at">; Update: Partial<Omit<Profile, "id">> };
            parent_students: { Row: ParentStudent; Insert: Omit<ParentStudent, "id" | "created_at">; Update: Partial<Omit<ParentStudent, "id">> };
            courses: { Row: Course; Insert: Omit<Course, "id" | "created_at">; Update: Partial<Omit<Course, "id">> };
            classes: { Row: Class; Insert: Omit<Class, "id" | "created_at">; Update: Partial<Omit<Class, "id">> };
            enrollments: { Row: Enrollment; Insert: Omit<Enrollment, "id" | "enrolled_at">; Update: Partial<Omit<Enrollment, "id">> };
            lessons: { Row: Lesson; Insert: Omit<Lesson, "id" | "created_at">; Update: Partial<Omit<Lesson, "id">> };
            assignments: { Row: Assignment; Insert: Omit<Assignment, "id" | "created_at">; Update: Partial<Omit<Assignment, "id">> };
            questions: { Row: Question; Insert: Omit<Question, "id" | "created_at">; Update: Partial<Omit<Question, "id">> };
            submissions: { Row: Submission; Insert: Omit<Submission, "id" | "submitted_at">; Update: Partial<Omit<Submission, "id">> };
            attendance: { Row: Attendance; Insert: Omit<Attendance, "id" | "created_at">; Update: Partial<Omit<Attendance, "id">> };
            notifications: { Row: Notification; Insert: Omit<Notification, "id" | "created_at">; Update: Partial<Omit<Notification, "id">> };
            announcements: { Row: Announcement; Insert: Omit<Announcement, "id" | "created_at">; Update: Partial<Omit<Announcement, "id">> };
            feedback: { Row: Feedback; Insert: Omit<Feedback, "id" | "created_at">; Update: Partial<Omit<Feedback, "id">> };
            leave_requests: { Row: LeaveRequest; Insert: Omit<LeaveRequest, "id" | "created_at">; Update: Partial<Omit<LeaveRequest, "id">> };
            payments: { Row: Payment; Insert: Omit<Payment, "id" | "created_at">; Update: Partial<Omit<Payment, "id">> };
            invoices: { Row: Invoice; Insert: Omit<Invoice, "id" | "issued_at">; Update: Partial<Omit<Invoice, "id">> };
            ai_analyses: { Row: AIAnalysis; Insert: Omit<AIAnalysis, "id" | "created_at">; Update: Partial<Omit<AIAnalysis, "id">> };
            grade_reports: { Row: GradeReport; Insert: Omit<GradeReport, "id">; Update: Partial<Omit<GradeReport, "id">> };
            student_points: { Row: StudentPoint; Insert: Omit<StudentPoint, "id" | "created_at">; Update: Partial<Omit<StudentPoint, "id">> };
            rubrics: { Row: Rubric; Insert: Omit<Rubric, "id" | "created_at" | "updated_at">; Update: Partial<Omit<Rubric, "id">> };
            rubric_criteria: { Row: RubricCriterion; Insert: Omit<RubricCriterion, "id" | "created_at">; Update: Partial<Omit<RubricCriterion, "id">> };
            score_adjustments: { Row: ScoreAdjustment; Insert: Omit<ScoreAdjustment, "id" | "created_at">; Update: Partial<Omit<ScoreAdjustment, "id">> };
            attendance_policies: { Row: AttendancePolicy; Insert: Omit<AttendancePolicy, "id" | "created_at" | "updated_at">; Update: Partial<Omit<AttendancePolicy, "id">> };
            absence_requests: { Row: AbsenceRequestK12; Insert: Omit<AbsenceRequestK12, "id" | "created_at">; Update: Partial<Omit<AbsenceRequestK12, "id">> };
            intervention_cases: { Row: InterventionCase; Insert: Omit<InterventionCase, "id" | "created_at" | "updated_at">; Update: Partial<Omit<InterventionCase, "id">> };
            intervention_actions: { Row: InterventionAction; Insert: Omit<InterventionAction, "id" | "created_at">; Update: Partial<Omit<InterventionAction, "id">> };
            learning_ai_jobs: { Row: LearningAiJob; Insert: Omit<LearningAiJob, "id" | "created_at">; Update: Partial<Omit<LearningAiJob, "id">> };
            school_ai_quotas: { Row: SchoolAiQuota; Insert: Omit<SchoolAiQuota, "id" | "created_at" | "updated_at">; Update: Partial<Omit<SchoolAiQuota, "id">> };
        };
    };
}
