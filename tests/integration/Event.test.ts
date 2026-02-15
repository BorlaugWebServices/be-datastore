import DataStore from '../../lib/DataStore';
import {EventRow} from "../../lib/dbTypes";

describe('Event Module Integration', () => {
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

  const mockEventId = '100-1'; // Standard format: blockNumber-eventIndex
  const mockEvent: EventRow = {
    id: mockEventId,
    index: 1,
    blockNumber: 100,
    extrinsicid: '0xextrinsic_hash',
    phase: {ApplyExtrinsic: 1},
    meta: {documentation: ['Test event description']},
    event: {section: 'balances', method: 'Transfer', data: []},
    timestamp: 1700000000,
    significant: true
  };

  test('should save and retrieve an event by id', async () => {
    await store.event.save(mockEvent);

    const result = await store.event.get(mockEventId);
    expect(result).toBeDefined();
    expect(result?.id).toBe(mockEventId);
    expect(result?.blockNumber).toBe(100);
    expect(result?.significant).toBe(true);
  });

  test('should prioritize cache over database for events', async () => {
    await store.event.save(mockEvent);


    await store.db('event').where('id', mockEventId).update({
      significant: false
    });

    const result = await store.event.get(mockEventId);
    expect(result?.significant).toBe(true);
  });

  test('should retrieve multiple events using getList', async () => {
    const event2Id = '100-2';
    const mockEvent2: EventRow = {
      ...mockEvent,
      id: event2Id,
      index: 2
    };

    await store.event.save(mockEvent);
    await store.event.save(mockEvent2);

    const list = await store.event.getList([mockEventId, event2Id]);

    expect(list).toHaveLength(2);
    const ids = list.map(e => e?.id);
    expect(ids).toContain(mockEventId);
    expect(ids).toContain(event2Id);
  });

  test('should return null for non-existent event', async () => {
    const result = await store.event.get('999-999');
    expect(result).toBeNull();
  });

  test('should return null for invalid event id format', async () => {
    const result = await store.event.get('invalid_id_format');
    expect(result).toBeNull();
  });

  test('should truncate event table and return deleted rows count', async () => {
    await store.event.save(mockEvent);
    const deletedCount = await store.event.truncate();
    await store.clearCache();

    expect(Number(deletedCount)).toBeGreaterThanOrEqual(1);


    const result = await store.event.get(mockEventId);
    expect(result).toBeNull();
  });
});