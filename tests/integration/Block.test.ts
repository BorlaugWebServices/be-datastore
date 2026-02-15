import DataStore from '../../lib/DataStore';

describe('Block Module Integration', () => {
  let store: DataStore;

  beforeAll(async () => {
    // Uses variables defined in your test.ts logic
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
    await store.db.destroy(); // Fixes the "failed to exit gracefully" error
    if (store.cache.disconnect) await store.cache.disconnect();
  });

  test('should save and retrieve a block by hash', async () => {
    const validHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const mockBlock = {
      number: 1,
      hash: validHash,
      significant: true,
      transactions: [],
      events: [],
      inherents: [],
      logs: []
    };

    await store.block.save(mockBlock as any);
    const result = await store.block.get(validHash);

    expect(result).toBeDefined();
    expect(result?.number).toBe(1);
  });

  test('should prioritize cache over database', async () => {
    const validHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const mockBlock = {number: 5, hash: validHash, transactions: []};
    await store.block.save(mockBlock as any);

    // Manually change the database value (bypass the API)
    await store.db('block').where('number', 5).update({hash: '0xHACKED'});

    // The 'get' should still return the original hash because it's in Redis
    const cachedResult = await store.block.get('5');
    expect(cachedResult?.hash).toBe(validHash);
  });
});