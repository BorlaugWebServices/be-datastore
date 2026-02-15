import DataStore from '../../lib/DataStore';
import {AuditActivityRow, AuditRow} from "../../lib/dbTypes";

describe('Audit Module Integration', () => {
  let store: DataStore;

  beforeAll(async () => {
    store = new DataStore(
      'pg',
      process.env.TEST_DATABASE_URL!,
      process.env.REDIS_HOST!,
      Number(process.env.REDIS_PORT),
      Number(process.env.TTL_MIN),
      Number(process.env.TTL_MAX)
    );
    await store.connect();
  });

  beforeEach(async () => {
    await store.cleanup();
  });

  afterAll(async () => {
    await store.db.destroy();
    if (store.cache.disconnect) await store.cache.disconnect();
  });

  const validAuditId = '5001';
  const mockAudit: AuditRow = {
    id: validAuditId,
    audit_creator: '0xcreator_address',
    auditor: '0xauditor_address',
    blockNumber: 1234,
    blockHash: '0xblockhash',
    extrinsicHash: '0xextrinsichash',
    timestamp: 1700000000,
  };

  test('should save and retrieve an audit by id', async () => {
    await store.audit.save(mockAudit);
    const result = await store.audit.get(validAuditId);

    expect(result).toBeDefined();
    expect(result?.id).toBe(validAuditId);
    expect(result?.audit_creator).toBe('0xcreator_address');
    expect(result?.auditor).toBe('0xauditor_address');
  });

  test('should return null for invalid audit id format', async () => {
    // Audit.ts uses NUMBER_PATTERN.test(id) for validation
    const result = await store.audit.get('invalid_id_abc');
    expect(result).toBeNull();
  });

  test('should prioritize cache over database for audit records', async () => {
    await store.audit.save(mockAudit);

    // Manually change the database value to simulate cache priority
    await store.db('audit').where('id', validAuditId).update({
      auditor: '0xmodified_auditor'
    });

    const result = await store.audit.get(validAuditId);
    // Should still return the original auditor from the Redis cache
    expect(result?.auditor).toBe('0xauditor_address');
  });

  test('should save and retrieve activities for an audit', async () => {
    await store.audit.save(mockAudit);

    const mockActivity: AuditActivityRow = {
      audit_id: validAuditId,
      tx_hash: '0xaudit_tx_hash',
    };

    await store.audit.saveActivity(mockActivity);

    const activities = await store.audit.getActivities(validAuditId);
    expect(activities).toBeDefined();
    expect(activities.length).toBe(1);
    expect(activities[0]).toBe('0xaudit_tx_hash');
  });

  test('should truncate audit and audit_activity tables', async () => {
    await store.audit.save(mockAudit);
    await store.audit.saveActivity({
      audit_id: validAuditId,
      tx_hash: '0xactivity_hash'
    });

    const deletedRows = await store.audit.truncate();
    await store.clearCache();

    // Result is Promise.all([db('audit').del(), db('audit_activity').del()])
    expect(deletedRows).toHaveLength(2);
    expect(deletedRows[0]).toBeGreaterThanOrEqual(1); // Rows from 'audit'
    expect(deletedRows[1]).toBeGreaterThanOrEqual(1); // Rows from 'audit_activity'

    const result = await store.audit.get(validAuditId);
    expect(result).toBeNull();
  });
});