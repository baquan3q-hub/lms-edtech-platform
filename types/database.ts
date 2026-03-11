// ============================================================
// Database Type Definitions — E-Learning Platform
// Đảm bảo Type-safety cho toàn dự án
// ============================================================

// Enum types
export type UserRole = "admin" | "teacher" | "student" | "parent";
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
    room: string | null;
    schedule: Record<string, unknown> | null; // JSONB — lịch học
    max_students: number;
    created_at: string;
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
        };
    };
}
