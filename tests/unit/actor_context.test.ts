import { describe, it, expect } from 'vitest';
import { AccessError, requireSchoolScope, ActorContext, DEFAULT_PILOT_SCHOOL_ID } from '@/lib/auth/actor-context';

describe('Phase 1 ActorContext & Multi-School Isolation Unit Tests', () => {
  it('AccessError initializes with correct status, code, and message', () => {
    const err = new AccessError(403, 'Cấm truy cập', 'CROSS_SCHOOL_DENIED');
    expect(err.status).toBe(403);
    expect(err.message).toBe('Cấm truy cập');
    expect(err.code).toBe('CROSS_SCHOOL_DENIED');
    expect(err.name).toBe('AccessError');
  });

  it('requireSchoolScope blocks a school admin from another school', () => {
    const adminActor: ActorContext = {
      userId: 'admin-uuid',
      schoolId: DEFAULT_PILOT_SCHOOL_ID,
      roles: ['admin'],
      currentRole: 'admin',
      expiresAt: Date.now() + 3600,
    };

    expect(() => {
      requireSchoolScope(adminActor, '00000000-0000-0000-0002-000000000000');
    }).toThrow(AccessError);
  });

  it('requireSchoolScope allows teacher to access their own school', () => {
    const teacherActor: ActorContext = {
      userId: 'teacher-uuid',
      schoolId: DEFAULT_PILOT_SCHOOL_ID,
      roles: ['teacher'],
      currentRole: 'teacher',
      expiresAt: Date.now() + 3600,
    };

    expect(() => {
      requireSchoolScope(teacherActor, DEFAULT_PILOT_SCHOOL_ID);
    }).not.toThrow();
  });

  it('requireSchoolScope blocks teacher from accessing another school', () => {
    const teacherActor: ActorContext = {
      userId: 'teacher-uuid',
      schoolId: DEFAULT_PILOT_SCHOOL_ID,
      roles: ['teacher'],
      currentRole: 'teacher',
      expiresAt: Date.now() + 3600,
    };

    const anotherSchoolId = '00000000-0000-0000-0002-000000000000';

    expect(() => {
      requireSchoolScope(teacherActor, anotherSchoolId);
    }).toThrow(AccessError);

    try {
      requireSchoolScope(teacherActor, anotherSchoolId);
    } catch (err: unknown) {
      const accessErr = err as AccessError;
      expect(accessErr.status).toBe(403);
      expect(accessErr.code).toBe('CROSS_SCHOOL_DENIED');
    }
  });

  it('requireSchoolScope blocks student from accessing another school', () => {
    const studentActor: ActorContext = {
      userId: 'student-uuid',
      schoolId: DEFAULT_PILOT_SCHOOL_ID,
      roles: ['student'],
      currentRole: 'student',
      expiresAt: Date.now() + 3600,
    };

    expect(() => {
      requireSchoolScope(studentActor, 'different-school-id');
    }).toThrow(AccessError);

    try {
      requireSchoolScope(studentActor, 'different-school-id');
    } catch (err: unknown) {
      const accessErr = err as AccessError;
      expect(accessErr.status).toBe(403);
      expect(accessErr.code).toBe('CROSS_SCHOOL_DENIED');
    }
  });
});
