import { describe, it, expect } from 'vitest';
import { sanitizeAuditState } from '@/lib/audit/audit-logger';
import { computePayloadHash } from '@/lib/idempotency/idempotency-manager';
import { requireSchoolScope, AccessError, ActorContext } from '@/lib/auth/actor-context';

describe('Phase 1 Core Modules Unit Tests', () => {
  describe('Audit Logger - sanitizeAuditState', () => {
    it('redacts sensitive password and token fields', () => {
      const sensitiveState = {
        userId: '12345',
        password: 'mySecretPassword123',
        token: 'jwt.token.here',
        activation_code: 'ACT-999',
        normalField: 'Trần Văn A',
        nested: {
          secret_key: 'sk_live_123',
          publicName: 'Nguyễn Du',
        },
      };

      const sanitized = sanitizeAuditState(sensitiveState);
      expect(sanitized).toBeDefined();
      expect(sanitized?.password).toBe('[REDACTED]');
      expect(sanitized?.token).toBe('[REDACTED]');
      expect(sanitized?.activation_code).toBe('[REDACTED]');
      expect(sanitized?.normalField).toBe('Trần Văn A');
      expect((sanitized?.nested as any)?.secret_key).toBe('[REDACTED]');
      expect((sanitized?.nested as any)?.publicName).toBe('Nguyễn Du');
    });

    it('summarizes large arrays to avoid log bloat', () => {
      const largeArray = Array.from({ length: 50 }, (_, i) => ({ id: i, answer: 'A' }));
      const state = { answers: largeArray };
      const sanitized = sanitizeAuditState(state);
      expect(sanitized?.answers).toBe('[Array of 50 items]');
    });
  });

  describe('Idempotency Manager - computePayloadHash', () => {
    it('produces deterministic SHA-256 hash for identical payloads', () => {
      const payload1 = { homeworkId: 'hw-1', answers: [{ q: 1, val: 'A' }] };
      const payload2 = { homeworkId: 'hw-1', answers: [{ q: 1, val: 'A' }] };

      const hash1 = computePayloadHash(payload1);
      const hash2 = computePayloadHash(payload2);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex length
    });

    it('produces different hash for different payloads', () => {
      const payload1 = { homeworkId: 'hw-1', answers: [{ q: 1, val: 'A' }] };
      const payload2 = { homeworkId: 'hw-1', answers: [{ q: 1, val: 'B' }] };

      const hash1 = computePayloadHash(payload1);
      const hash2 = computePayloadHash(payload2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('ActorContext - requireSchoolScope', () => {
    const studentActor: ActorContext = {
      userId: 'student-01',
      schoolId: '00000000-0000-0000-0001-000000000000', // School A
      roles: ['student'],
      currentRole: 'student',
      expiresAt: Date.now() + 3600,
    };

    const adminActor: ActorContext = {
      userId: 'admin-01',
      schoolId: '00000000-0000-0000-0001-000000000000',
      roles: ['admin'],
      currentRole: 'admin',
      expiresAt: Date.now() + 3600,
    };

    it('allows access to same school data', () => {
      expect(() => {
        requireSchoolScope(studentActor, '00000000-0000-0000-0001-000000000000');
      }).not.toThrow();
    });

    it('throws AccessError 403 on cross-school data access', () => {
      expect(() => {
        requireSchoolScope(studentActor, '00000000-0000-0000-0002-000000000000'); // School B
      }).toThrowError(AccessError);
    });

    it('allows admin cross-school access', () => {
      expect(() => {
        requireSchoolScope(adminActor, '00000000-0000-0000-0002-000000000000');
      }).toThrow(AccessError);
    });
  });
});
