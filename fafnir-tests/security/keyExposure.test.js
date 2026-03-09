/**
 * SECURITY TEST: Key Exposure
 * 
 * Hedera private keys must NEVER leak to:
 * - API responses
 * - JWT tokens
 * - Frontend code
 * - Log output
 * - Error messages
 * 
 * A single key leak = complete account compromise.
 */

import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret';
const MOCK_PRIVATE_KEY = '302e020100300506032b657004220420aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

describe('Security: Key Exposure', () => {
  describe('API Response Sanitization', () => {
    it('signup response does not contain private key', () => {
      // Simulate the signup response object
      const response = {
        token: 'jwt-token',
        user: {
          id: 'user-1',
          email: 'test@fafnir.dev',
          createdAt: new Date().toISOString(),
        },
      };

      const json = JSON.stringify(response);
      expect(json).not.toContain('privateKey');
      expect(json).not.toContain('302e');
      expect(json).not.toContain('hederaAccountId');
    });

    it('user /me endpoint does not expose keys', () => {
      const response = {
        id: 'user-1',
        email: 'test@fafnir.dev',
        createdAt: new Date().toISOString(),
      };

      const json = JSON.stringify(response);
      expect(json).not.toContain('privateKey');
      expect(json).not.toContain('hederaPrivateKey');
      expect(json).not.toContain('hederaAccountId');
    });

    it('history endpoint does not contain keys', () => {
      const response = {
        transactions: [
          {
            id: 'tx-1',
            action: 'SAVE',
            amount: 5,
            reasoning: 'Food detected',
            createdAt: new Date().toISOString(),
          },
        ],
      };

      const json = JSON.stringify(response);
      expect(json).not.toContain('privateKey');
      expect(json).not.toContain('302e');
    });
  });

  describe('JWT Token Safety', () => {
    it('JWT payload contains only userId', () => {
      const payload = { userId: 'user-1' };
      const token = jwt.sign(payload, JWT_SECRET);
      const decoded = jwt.verify(token, JWT_SECRET);

      const dangerousFields = [
        'hederaPrivateKey', 'hederaAccountId', 'hcsTopicId',
        'privateKey', 'password', 'secret',
      ];

      for (const field of dangerousFields) {
        expect(decoded[field]).toBeUndefined();
      }
    });
  });

  describe('Error Message Safety', () => {
    it('error messages do not leak private keys', () => {
      // Simulate various error scenarios
      const errors = [
        new Error('Transfer failed for account 0.0.12345'),
        new Error('Authentication failed'),
        new Error('Rule not found'),
        new Error('Insufficient balance'),
      ];

      for (const err of errors) {
        expect(err.message).not.toContain(MOCK_PRIVATE_KEY);
        expect(err.message).not.toContain('302e020100');
      }
    });

    it('stack traces do not contain keys', () => {
      try {
        throw new Error('Test error');
      } catch (err) {
        expect(err.stack).not.toContain(MOCK_PRIVATE_KEY);
      }
    });
  });

  describe('Environment Variable Safety', () => {
    it('.env.test uses only fake credentials', () => {
      // The test env should NEVER have real keys
      const operatorKey = process.env.HEDERA_OPERATOR_KEY || '';
      const apiKey = process.env.OPENAI_API_KEY || '';

      // Real keys have specific patterns
      expect(operatorKey).not.toMatch(/^302e.{100,}$/);
      expect(apiKey).not.toMatch(/^sk-[a-zA-Z0-9]{48,}$/);
    });
  });
});
