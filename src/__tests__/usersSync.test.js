import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Regression Test Suite: Users Synchronization & Unique Index Reconciliation Engine
 * Tests handling of unique index constraints (email, username) during sync operations.
 */

class MockIndexedDBStore {
  constructor(keyPath = 'id', indexes = {}) {
    this.keyPath = keyPath;
    this.indexes = indexes; // name -> { keyPath, unique }
    this.data = new Map();
  }

  put(record) {
    const key = String(record[this.keyPath]);
    
    // Validate unique index constraints
    for (const [indexName, meta] of Object.entries(this.indexes)) {
      if (meta.unique) {
        const val = record[meta.keyPath];
        if (val !== undefined && val !== null && val !== '') {
          for (const [existingKey, existingRecord] of this.data.entries()) {
            if (existingKey !== key && existingRecord[meta.keyPath] === val) {
              const err = new Error(`ConstraintError: Unable to add key to index '${indexName}': at least one key does not satisfy the uniqueness requirements.`);
              err.name = 'ConstraintError';
              throw err;
            }
          }
        }
      }
    }

    this.data.set(key, { ...record });
    return key;
  }

  get(id) {
    return this.data.get(String(id)) || null;
  }

  delete(id) {
    this.data.delete(String(id));
  }

  getAll() {
    return Array.from(this.data.values());
  }

  search(indexName, value) {
    const meta = this.indexes[indexName];
    if (!meta) return [];
    const results = [];
    for (const record of this.data.values()) {
      if (record[meta.keyPath] === value) {
        results.push(record);
      }
    }
    return results;
  }
}

class MockSyncEngine {
  constructor(store) {
    this.store = store;
  }

  reconcileUniqueIndexConflicts(record) {
    const stringId = String(record.id);

    if (record.email && typeof record.email === 'string' && record.email.trim()) {
      const emailMatches = this.store.search('email', record.email.trim());
      for (const match of emailMatches) {
        if (match && String(match.id) !== stringId) {
          this.store.delete(String(match.id));
        }
      }
    }

    if (record.username && typeof record.username === 'string' && record.username.trim()) {
      const usernameMatches = this.store.search('username', record.username.trim());
      for (const match of usernameMatches) {
        if (match && String(match.id) !== stringId) {
          this.store.delete(String(match.id));
        }
      }
    }
  }

  syncUser(userRecord) {
    const localRecord = { ...userRecord, id: String(userRecord.id) };
    this.reconcileUniqueIndexConflicts(localRecord);
    this.store.put(localRecord);
    return localRecord;
  }
}

describe('Users Synchronization & Unique Index Reconciliation', () => {
  let store;
  let syncEngine;

  beforeEach(() => {
    store = new MockIndexedDBStore('id', {
      username: { keyPath: 'username', unique: true },
      email: { keyPath: 'email', unique: true }
    });
    syncEngine = new MockSyncEngine(store);
  });

  it('1. Insert new user with unique email and id', () => {
    const user = { id: 'admin', username: 'admin', email: 'admin@alaminstore.com', name: 'Admin User' };
    syncEngine.syncUser(user);

    const saved = store.get('admin');
    expect(saved).not.toBeNull();
    expect(saved.email).toBe('admin@alaminstore.com');
  });

  it('2. Update existing user (same email and same id)', () => {
    const userV1 = { id: 'admin', username: 'admin', email: 'admin@alaminstore.com', name: 'Admin V1' };
    syncEngine.syncUser(userV1);

    const userV2 = { id: 'admin', username: 'admin', email: 'admin@alaminstore.com', name: 'Admin V2 Updated' };
    syncEngine.syncUser(userV2);

    const saved = store.get('admin');
    expect(saved.name).toBe('Admin V2 Updated');
    expect(store.getAll().length).toBe(1);
  });

  it('3. Overwrite existing user with new details', () => {
    const userV1 = { id: 'cashier1', username: 'cashier1', email: 'cashier1@alaminstore.com', role: 'cashier' };
    syncEngine.syncUser(userV1);

    const userV2 = { id: 'cashier1', username: 'cashier1', email: 'cashier1@alaminstore.com', role: 'manager' };
    syncEngine.syncUser(userV2);

    expect(store.get('cashier1').role).toBe('manager');
  });

  it('4. Reconcile user with same email but different id (ID mismatch resolution)', () => {
    // Local seeded user: id='admin'
    const localUser = { id: 'admin', username: 'admin', email: 'admin@admin.com', name: 'Local Admin' };
    syncEngine.syncUser(localUser);

    // Cloud record: id='1' (different ID, same email)
    const cloudUser = { id: '1', username: '1', email: 'admin@admin.com', name: 'Cloud Admin' };

    // Before fix: store.put(cloudUser) throws ConstraintError!
    // With fix: syncUser reconciles old key 'admin' and puts key '1'
    expect(() => syncEngine.syncUser(cloudUser)).not.toThrow();

    expect(store.get('admin')).toBeNull(); // Old key purged
    expect(store.get('1')).not.toBeNull(); // New key created
    expect(store.get('1').email).toBe('admin@admin.com');
    expect(store.getAll().length).toBe(1);
  });

  it('5. Duplicate realtime events for the same record', () => {
    const user = { id: 'user_100', username: 'user100', email: 'user100@test.com' };
    
    syncEngine.syncUser(user);
    syncEngine.syncUser(user);
    syncEngine.syncUser(user);

    expect(store.getAll().length).toBe(1);
    expect(store.get('user_100').email).toBe('user100@test.com');
  });

  it('6. Repeated syncs cycle', () => {
    const user1 = { id: 'u1', username: 'usr1', email: 'u1@test.com' };
    const user2 = { id: 'u2', username: 'usr2', email: 'u2@test.com' };

    for (let cycle = 0; cycle < 5; cycle++) {
      syncEngine.syncUser(user1);
      syncEngine.syncUser(user2);
    }

    expect(store.getAll().length).toBe(2);
  });

  it('7. Concurrent synchronization simulation', async () => {
    const user = { id: 'conc_1', username: 'conc1', email: 'conc@test.com' };

    const promises = [
      Promise.resolve().then(() => syncEngine.syncUser(user)),
      Promise.resolve().then(() => syncEngine.syncUser(user)),
      Promise.resolve().then(() => syncEngine.syncUser({ ...user, name: 'Concurrent Update' }))
    ];

    await Promise.all(promises);

    expect(store.getAll().length).toBe(1);
    expect(store.get('conc_1').email).toBe('conc@test.com');
  });
});
