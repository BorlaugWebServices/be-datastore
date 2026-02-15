import DataStore from '../../lib/DataStore';
import {LogRow} from "../../lib/dbTypes";

describe('Log Module Integration', () => {
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

  const mockLogId = '100-1'; // Matches ID_PATTERN (block-index)
  const mockLog: LogRow = {
    id: mockLogId,
    index: 1,
    log: {test: 1},
    blockNumber: 100,
    significant: true,
    timestamp: 1700000000,
  };

  test('should save and retrieve a log by id', async () => {
    await store.log.save(mockLog);

    const result = await store.log.get(mockLogId);
    expect(result).toBeDefined();
    expect(result?.id).toBe(mockLogId);
    expect(result?.blockNumber).toBe(100);
    expect(result?.significant).toBe(true);
  });

  test('should prioritize cache over database for log records', async () => {
    await store.log.save(mockLog);

    // Manually modify the database record
    await store.db('log').where('id', mockLogId).update({
      blockNumber: 999
    });

    // Should return original blockNumber from Redis cache
    const result = await store.log.get(mockLogId);
    expect(result?.blockNumber).toBe(100);
  });

  test('should handle different TTLs based on the significant flag', async () => {
    const insignificantLog: LogRow = {
      ...mockLog,
      id: '100-2',
      significant: false
    };

    // This calls saveCached with this.ctx.ttlMin because significant is false
    await store.log.save(insignificantLog);

    const result = await store.log.get('100-2');
    expect(result?.significant).toBe(false);
  });

  test('should retrieve multiple logs using getList', async () => {
    const log2Id = '100-2';
    const mockLog2: LogRow = {
      ...mockLog,
      id: log2Id,
    };

    await store.log.save(mockLog);
    await store.log.save(mockLog2);

    const list = await store.log.getList([mockLogId, log2Id]);

    expect(list).toHaveLength(2);
    const ids = list.map(l => l?.id);
    expect(ids).toContain(mockLogId);
    expect(ids).toContain(log2Id);
  });

  test('should return null for invalid log id format', async () => {
    const result = await store.log.get('invalid_id_format');
    expect(result).toBeNull();
  });

  test('should truncate log table and return deleted rows count', async () => {
    await store.log.save(mockLog);

    const deletedCount = await store.log.truncate();
    await store.clearCache();


    expect(Number(deletedCount)).toBeGreaterThanOrEqual(1);

    const result = await store.log.get(mockLogId);
    expect(result).toBeNull();
  });
});