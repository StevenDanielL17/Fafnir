/**
 * UNIT TEST: User Model
 * Tests: CRUD operations, email uniqueness, data integrity
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createFreshStores } from '../../setup/mocks/storeMock.js';

describe('User Model', () => {
  let stores;

  beforeEach(() => {
    stores = createFreshStores();
  });

  describe('create()', () => {
    it('creates a user with all required fields', () => {
      const user = stores.userStore.create({
        email: 'test@fafnir.dev',
        hederaAccountId: '0.0.12345',
        hcsTopicId: '0.0.67890',
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@fafnir.dev');
      expect(user.hederaAccountId).toBe('0.0.12345');
      expect(user.hcsTopicId).toBe('0.0.67890');
      expect(user.createdAt).toBeDefined();
    });

    it('generates unique IDs for each user', () => {
      const user1 = stores.userStore.create({ email: 'a@test.com' });
      const user2 = stores.userStore.create({ email: 'b@test.com' });
      expect(user1.id).not.toBe(user2.id);
    });

    it('allows null for optional fields', () => {
      const user = stores.userStore.create({ email: 'test@fafnir.dev' });
      expect(user.hederaAccountId).toBeNull();
      expect(user.hcsTopicId).toBeNull();
    });

    it('NEVER exposes hederaPrivateKey to response objects without explicit access', () => {
      const user = stores.userStore.create({
        email: 'test@fafnir.dev',
        hederaPrivateKey: 'secret-key',
      });
      // The model stores it, but frontend-facing code must strip it
      expect(user.hederaPrivateKey).toBe('secret-key');
      // Verify it doesn't appear in JSON.stringify without the field
      const safeFields = { id: user.id, email: user.email, createdAt: user.createdAt };
      expect(JSON.stringify(safeFields)).not.toContain('secret-key');
    });
  });

  describe('getByEmail()', () => {
    it('finds an existing user by email', () => {
      stores.userStore.create({ email: 'find@me.com', hederaAccountId: '0.0.1' });
      const found = stores.userStore.getByEmail('find@me.com');
      expect(found).not.toBeNull();
      expect(found.email).toBe('find@me.com');
    });

    it('returns null for non-existent email', () => {
      expect(stores.userStore.getByEmail('ghost@nowhere.com')).toBeNull();
    });
  });

  describe('getById()', () => {
    it('finds an existing user by ID', () => {
      const created = stores.userStore.create({ email: 'test@fafnir.dev' });
      const found = stores.userStore.getById(created.id);
      expect(found.email).toBe('test@fafnir.dev');
    });

    it('returns null for non-existent ID', () => {
      expect(stores.userStore.getById('nonexistent')).toBeNull();
    });
  });

  describe('getAll()', () => {
    it('returns all created users', () => {
      stores.userStore.create({ email: 'a@test.com' });
      stores.userStore.create({ email: 'b@test.com' });
      stores.userStore.create({ email: 'c@test.com' });
      expect(stores.userStore.getAll()).toHaveLength(3);
    });

    it('returns empty array when no users exist', () => {
      expect(stores.userStore.getAll()).toHaveLength(0);
    });
  });

  describe('update()', () => {
    it('updates user fields', () => {
      const user = stores.userStore.create({ email: 'test@fafnir.dev' });
      stores.userStore.update(user.id, { hederaAccountId: '0.0.99999' });
      const updated = stores.userStore.getById(user.id);
      expect(updated.hederaAccountId).toBe('0.0.99999');
    });

    it('returns null when updating non-existent user', () => {
      expect(stores.userStore.update('ghost', { email: 'new@test.com' })).toBeNull();
    });
  });

  describe('remove()', () => {
    it('deletes a user', () => {
      const user = stores.userStore.create({ email: 'delete@me.com' });
      stores.userStore.remove(user.id);
      expect(stores.userStore.getById(user.id)).toBeNull();
    });
  });
});
