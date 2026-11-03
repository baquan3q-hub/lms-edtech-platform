import { describe, it, expect } from 'vitest';
import {
  ActorContext,
  AccessError,
  requireHomeroomScope,
  requireSubjectScope,
  DEFAULT_PILOT_SCHOOL_ID,
} from '@/lib/auth/actor-context';

describe('Phase 2 K12 Rosters & Scope Unit Tests', () => {
  const teacherContext: ActorContext = {
    userId: 'teacher-uuid-1',
    schoolId: DEFAULT_PILOT_SCHOOL_ID,
    roles: ['teacher'],
    currentRole: 'teacher',
    homeroomScope: ['homeroom-8a'],
    subjectScope: ['subject-math-id', 'subject-it-id'],
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
  };

  const adminContext: ActorContext = {
    userId: 'admin-uuid-1',
    schoolId: DEFAULT_PILOT_SCHOOL_ID,
    roles: ['admin'],
    currentRole: 'admin',
    homeroomScope: [],
    subjectScope: [],
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
  };

  it('unit: head teacher can access assigned homeroom', () => {
    expect(() => {
      requireHomeroomScope(teacherContext, 'homeroom-8a');
    }).not.toThrow();
  });

  it('unit: teacher is blocked from managing unassigned homeroom', () => {
    expect(() => {
      requireHomeroomScope(teacherContext, 'homeroom-9b');
    }).toThrow(AccessError);

    try {
      requireHomeroomScope(teacherContext, 'homeroom-9b');
    } catch (err: any) {
      expect(err.code).toBe('HOMEROOM_ACCESS_DENIED');
      expect(err.status).toBe(403);
    }
  });

  it('unit: admin can access a homeroom in its own school', () => {
    expect(() => {
      requireHomeroomScope(adminContext, 'any-homeroom-id', adminContext.schoolId);
    }).not.toThrow();
  });

  it('unit: subject teacher can manage assignments/grades for assigned subject', () => {
    expect(() => {
      requireSubjectScope(teacherContext, 'subject-math-id');
      requireSubjectScope(teacherContext, 'subject-it-id');
    }).not.toThrow();
  });

  it('unit: teacher is blocked from altering grades of other subjects', () => {
    expect(() => {
      requireSubjectScope(teacherContext, 'subject-literature-id');
    }).toThrow(AccessError);

    try {
      requireSubjectScope(teacherContext, 'subject-literature-id');
    } catch (err: any) {
      expect(err.code).toBe('SUBJECT_ACCESS_DENIED');
      expect(err.status).toBe(403);
    }
  });

  it('unit: admin can manage a subject within its school', () => {
    expect(() => {
      requireSubjectScope(adminContext, 'subject-literature-id', adminContext.schoolId);
    }).not.toThrow();
  });
});
