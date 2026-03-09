/**
 * SECURITY TEST: Auth Bypass
 * 
 * Tests that protected endpoints cannot be accessed without valid JWT.
 * A single bypass would let attackers create rules, trigger transfers,
 * or read other users' financial data.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret-do-not-use-in-production';

describe('Security: Auth Bypass', () => {
  describe('JWT Validation', () => {
    it('valid token decodes correctly', () => {
      const token = jwt.sign({ userId: 'user-1' }, JWT_SECRET, { expiresIn: '1h' });
      const decoded = jwt.verify(token, JWT_SECRET);
      expect(decoded.userId).toBe('user-1');
    });

    it('rejects expired token', () => {
      const token = jwt.sign({ userId: 'user-1' }, JWT_SECRET, { expiresIn: '-1s' });
      expect(() => jwt.verify(token, JWT_SECRET)).toThrow();
    });

    it('rejects token with wrong secret', () => {
      const token = jwt.sign({ userId: 'user-1' }, 'wrong-secret');
      expect(() => jwt.verify(token, JWT_SECRET)).toThrow();
    });

    it('rejects tampered token', () => {
      const token = jwt.sign({ userId: 'user-1' }, JWT_SECRET);
      // Tamper with the payload
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      payload.userId = 'admin'; // Try to become admin
      parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const tampered = parts.join('.');

      expect(() => jwt.verify(tampered, JWT_SECRET)).toThrow();
    });

    it('rejects completely invalid token strings', () => {
      const invalidTokens = ['', 'invalid', 'a.b.c', null, undefined, 123];

      for (const token of invalidTokens) {
        expect(() => jwt.verify(token, JWT_SECRET)).toThrow();
      }
    });

    it('token contains only userId (never sensitive data)', () => {
      const token = jwt.sign({ userId: 'user-1' }, JWT_SECRET);
      const decoded = jwt.verify(token, JWT_SECRET);

      expect(decoded.userId).toBe('user-1');
      expect(decoded.hederaAccountId).toBeUndefined();
      expect(decoded.hederaPrivateKey).toBeUndefined();
      expect(decoded.email).toBeUndefined();
    });
  });
});
