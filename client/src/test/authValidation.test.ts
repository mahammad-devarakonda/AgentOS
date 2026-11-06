import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from '../validation/authSchemas';

describe('Authentication Validation (Zod)', () => {
  describe('Login Validation', () => {
    it('should validate valid login credentials', () => {
      const result = loginSchema.safeParse({
        email: 'developer@agentos.ai',
        password: 'ValidPassword123!',
        remember_me: true,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'ValidPassword123!',
        remember_me: false,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('valid email');
      }
    });

    it('should reject empty password', () => {
      const result = loginSchema.safeParse({
        email: 'developer@agentos.ai',
        password: '',
        remember_me: false,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Password is required');
      }
    });
  });

  describe('Registration Validation', () => {
    it('should validate valid registration data', () => {
      const result = registerSchema.safeParse({
        full_name: 'Sarah Connor',
        email: 'sarah@agentos.ai',
        password: 'SecurePassword123!',
        confirm_password: 'SecurePassword123!',
        terms_accepted: true,
      });
      expect(result.success).toBe(true);
    });

    it('should reject when passwords do not match', () => {
      const result = registerSchema.safeParse({
        full_name: 'Sarah Connor',
        email: 'sarah@agentos.ai',
        password: 'SecurePassword123!',
        confirm_password: 'DifferentPassword123!',
        terms_accepted: true,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Passwords do not match');
      }
    });

    it('should reject password with less than 8 characters', () => {
      const result = registerSchema.safeParse({
        full_name: 'Sarah Connor',
        email: 'sarah@agentos.ai',
        password: 'short',
        confirm_password: 'short',
        terms_accepted: true,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 8 characters');
      }
    });

    it('should reject registration if terms are not accepted', () => {
      const result = registerSchema.safeParse({
        full_name: 'Sarah Connor',
        email: 'sarah@agentos.ai',
        password: 'SecurePassword123!',
        confirm_password: 'SecurePassword123!',
        terms_accepted: false,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Terms and Conditions');
      }
    });

    it('should reject short full names', () => {
      const result = registerSchema.safeParse({
        full_name: 'S',
        email: 'sarah@agentos.ai',
        password: 'SecurePassword123!',
        confirm_password: 'SecurePassword123!',
        terms_accepted: true,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 2 characters');
      }
    });
  });
});

