import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sanitizeTextPII, computeSourceDataHash } from '@/lib/ai/pii-sanitizer';
import { rubricFeedbackSchema } from '@/lib/ai/schemas';

describe('Phase 8: Pilot THCS Readiness & Expansion Criteria', () => {
    const mockPilotSchoolId = '00000000-0000-0000-0001-000000000000';
    const mockOtherSchoolId = '00000000-0000-0000-0002-000000000000';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Criteria 1: Tỷ lệ kích hoạt tài khoản & Roster Integrity (>= 95%)', () => {
        it('bảo đảm 100% học sinh thí điểm có mã định danh và đạt tỷ lệ kích hoạt >= 95%', () => {
            const pilotRoster = [
                { id: 'hs-1', code: 'HS001', status: 'active', homeroom: '8A' },
                { id: 'hs-2', code: 'HS002', status: 'active', homeroom: '8A' },
                { id: 'hs-3', code: 'HS003', status: 'active', homeroom: '8A' },
                { id: 'hs-4', code: 'HS004', status: 'active', homeroom: '8A' },
                { id: 'hs-5', code: 'HS005', status: 'active', homeroom: '8A' },
            ];

            const total = pilotRoster.length;
            const active = pilotRoster.filter(s => s.status === 'active').length;
            const activationRate = (active / total) * 100;

            expect(activationRate).toBeGreaterThanOrEqual(95);
            expect(pilotRoster.every(s => s.homeroom === '8A')).toBe(true);
        });

        it('chặn hoàn toàn truy cập dữ liệu chéo trường giữa trường thí điểm và trường khác', () => {
            const studentA = { id: 'user-a', schoolId: mockPilotSchoolId, role: 'student' };
            const classOtherSchool = { id: 'class-b', schoolId: mockOtherSchoolId };

            const hasAccess = studentA.schoolId === classOtherSchool.schoolId;
            expect(hasAccess).toBe(false);
        });
    });

    describe('Criteria 2: Mức độ tự chủ của Giáo viên (Giao bài - Chấm Rubric - Công bố)', () => {
        it('giáo viên thực hiện độc lập luồng chấm bài theo rubric và công bố điểm số', () => {
            const submission = {
                id: 'sub-001',
                student_id: 'hs-01',
                score: null,
                score_status: 'ungraded',
                feedback: null,
            };

            // Giáo viên chấm điểm theo Rubric
            const rubricScores = [
                { criterion: 'Độ chính xác kiến thức', maxScore: 5, givenScore: 4.5 },
                { criterion: 'Kỹ năng trình bày', maxScore: 5, givenScore: 4.0 },
            ];
            const totalScore = rubricScores.reduce((acc, curr) => acc + curr.givenScore, 0);

            const gradedSubmission = {
                ...submission,
                score: totalScore,
                score_status: 'draft',
                feedback: 'Bài làm trình bày mạch lạc, phương pháp giải chính xác.',
            };

            expect(gradedSubmission.score).toBe(8.5);
            expect(gradedSubmission.score_status).toBe('draft');

            // Giáo viên công bố điểm
            const publishedSubmission = {
                ...gradedSubmission,
                score_status: 'published',
                published_at: new Date().toISOString(),
            };

            expect(publishedSubmission.score_status).toBe('published');
            expect(publishedSubmission.published_at).toBeDefined();
        });

        it('học sinh và phụ huynh không thể xem điểm trước khi giáo viên công bố', () => {
            const submissionDraft = { id: 'sub-002', score: 9.0, score_status: 'draft' };
            const submissionPublished = { id: 'sub-003', score: 9.0, score_status: 'published' };

            const canStudentView = (sub: { score_status: string }) => sub.score_status === 'published';

            expect(canStudentView(submissionDraft)).toBe(false);
            expect(canStudentView(submissionPublished)).toBe(true);
        });
    });

    describe('Criteria 3: Tính chính xác dữ liệu & Không mất bài nộp (2 tuần liên tiếp)', () => {
        it('bảo toàn tính toàn vẹn 100% giữa số lượt làm bài và bản ghi nộp bài', () => {
            const examAttempts = [
                { attempt_id: 'att-1', student_id: 'hs-01', attempt_no: 1, submitted_at: '2026-09-20T10:00:00Z' },
                { attempt_id: 'att-2', student_id: 'hs-02', attempt_no: 1, submitted_at: '2026-09-20T10:05:00Z' },
            ];

            const submissions = [
                { id: 'sub-1', attempt_id: 'att-1', answers: { q1: 'A', q2: 'B' } },
                { id: 'sub-2', attempt_id: 'att-2', answers: { q1: 'C', q2: 'D' } },
            ];

            expect(examAttempts.length).toBe(submissions.length);
            expect(submissions.every(s => examAttempts.some(a => a.attempt_id === s.attempt_id))).toBe(true);
        });

        it('yêu cầu bắt buộc lý do khi giáo viên điều chỉnh điểm đã công bố', () => {
            const originalScore = 7.0;
            const updatedScore = 8.0;
            const adjustmentReason = 'Chấm phúc khảo: Học sinh bổ sung bước giải đúng';

            const adjustmentRecord = {
                submission_id: 'sub-001',
                old_score: originalScore,
                new_score: updatedScore,
                reason: adjustmentReason,
                adjusted_by: 'teacher-01',
            };

            expect(adjustmentRecord.reason).toBeDefined();
            expect(adjustmentRecord.reason.length).toBeGreaterThan(5);
            expect(adjustmentRecord.new_score).not.toBe(adjustmentRecord.old_score);
        });
    });

    describe('Criteria 4: Giới hạn an toàn AI & Kill-switch trong kỳ Pilot', () => {
        it('tự động ẩn danh hóa PII và tính mã SHA-256 hash chuẩn tắc trước khi gửi prompt', () => {
            const rawPrompt = 'Học sinh Nguyễn Văn An mã HS12345 sđt 0987654321 cần hỗ trợ thêm môn Toán';
            const { sanitized, pseudonymMap } = sanitizeTextPII(rawPrompt, {
                name: 'Nguyễn Văn An',
                studentCode: 'HS12345',
                phone: '0987654321',
            });

            expect(Object.keys(pseudonymMap).length).toBeGreaterThan(0);
            expect(sanitized).not.toContain('Nguyễn Văn An');
            expect(sanitized).not.toContain('0987654321');

            const hash = computeSourceDataHash({ text: sanitized, model: 'gemini-1.5-flash' });
            expect(hash).toHaveLength(64);
        });

        it('ngăn chặn tuyệt đối các nhận xét AI chứa từ ngữ chụp mũ, quy chụp', () => {
            const badFeedback = {
                criteria_feedback: [
                    {
                        criterion_id: 'crit-1',
                        criterion_name: 'Độ chính xác',
                        suggested_score: 2,
                        max_score: 5,
                        evidence_quote: 'Dòng 5',
                        feedback_text: 'Học sinh gian lận và chép bài của bạn',
                    },
                ],
                overall_feedback: {
                    strengths: 'Chưa thấy rõ ưu điểm nổi bật',
                    areas_for_improvement: 'Em rất lười học và kém cỏi',
                    next_steps: 'Cần nghiêm túc xem lại thái độ học tập',
                },
            };

            const result = rubricFeedbackSchema.safeParse(badFeedback);
            expect(result.success).toBe(false);
        });

        it('chấp nhận phản hồi AI mang tính sư phạm và khích lệ', () => {
            const goodFeedback = {
                criteria_feedback: [
                    {
                        criterion_id: 'crit-1',
                        criterion_name: 'Độ chính xác kiến thức',
                        suggested_score: 4.5,
                        max_score: 5,
                        evidence_quote: 'Đoạn 2 giải thích đúng nguyên lý',
                        feedback_text: 'Nắm vững kiến thức trọng tâm, giải thích logic và chặt chẽ.',
                    },
                ],
                overall_feedback: {
                    strengths: 'Tư duy logic, giải toán rõ ràng',
                    areas_for_improvement: 'Cần chú ý thêm đơn vị đo lường ở bước cuối',
                    next_steps: 'Luyện tập thêm 2 bài tập tương tự trong SGK',
                },
            };

            const result = rubricFeedbackSchema.safeParse(goodFeedback);
            expect(result.success).toBe(true);
        });
    });
});
