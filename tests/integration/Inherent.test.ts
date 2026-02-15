import DataStore from '../../lib/DataStore';
import {EventRow} from "../../lib/dbTypes";
import {FullInherent} from "../../lib/types";

describe('Inherent Module Integration', () => {
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

  const mockId = '100-1'; // Typical block-index format for ID_PATTERN
  const eventId = 'event-01';
  const mockInherent: FullInherent = {
    id: mockId,
    index: 1,
    blockNumber: 100,
    timestamp: 1700000000,
    isSigned: true,
    method: {section: 'timestamp', method: 'set'},
    significant: true,
    events: [eventId] // Will be populated by fetchOne
  };

  test('should save and retrieve an inherent by id, including linked events', async () => {

    await store.inherent.save(mockInherent);

    await store.db('event').insert({
      id: eventId,
      extrinsicid: mockId,
      blockNumber: 100,
      timestamp: 1700000000
    } as EventRow);

    const result = await store.inherent.get(mockId);

    expect(result).toBeDefined();
    expect(result?.id).toBe(mockId);
    expect(result?.events).toContain(eventId);
    expect(result?.method).toEqual(mockInherent.method);
  });

  test('should prioritize cache over database and respect significance', async () => {
    await store.inherent.save(mockInherent);

    // Manually modify the database record
    await store.db('inherent').where('id', mockId).update({
      blockNumber: 999
    });

    // The 'get' should still return the original blockNumber (100) from Redis
    const result = await store.inherent.get(mockId);
    expect(result?.blockNumber).toBe(100);
  });

  test('should retrieve multiple inherents using getList', async () => {
    const id2 = '100-2';
    const mockInherent2: FullInherent = {
      ...mockInherent,
      id: id2,
      index: 2
    };

    await store.inherent.save(mockInherent);
    await store.inherent.save(mockInherent2);

    const list = await store.inherent.getList([mockId, id2]);

    expect(list).toHaveLength(2);
    const ids = list.map(i => i?.id);
    expect(ids).toContain(mockId);
    expect(ids).toContain(id2);
  });

  test('should return null for invalid inherent id format', async () => {
    // Inherent.ts uses ID_PATTERN.test(id)
    const result = await store.inherent.get('not_a_valid_id');
    expect(result).toBeNull();
  });

  test('should truncate inherent table and return deleted rows count', async () => {
    await store.inherent.save(mockInherent);

    const deletedCount = await store.inherent.truncate();
    await store.clearCache();

    expect(Number(deletedCount)).toBeGreaterThanOrEqual(1);

    const result = await store.inherent.get(mockId);
    expect(result).toBeNull();
  });
});