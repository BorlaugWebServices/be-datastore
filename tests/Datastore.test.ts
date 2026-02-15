import DataStore from '../lib/DataStore';

describe('DataStore Integration', () => {
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

  afterEach(async () => {
    await store.cleanup();
  });

  afterAll(async () => {
    await store.db.destroy();
    if (store.cache.disconnect) await store.cache.disconnect();
  });

  test('Block save should update latestBlockNumber in Redis', async () => {
    const mockBlock: any = {number: 103153, hash: '0xabc', significant: true};
    await store.block.save(mockBlock);

    const latest = await store.cache.get('latestBlockNumber');
    expect(Number(latest)).toBe(103153);
  });
});