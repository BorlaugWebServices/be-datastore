import DataStore from '../../lib/DataStore';
import {GroupActivityRow, GroupRow} from "../../lib/dbTypes";

describe('Group Module Integration', () => {
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


  test('should save and retrieve a group by id', async () => {
    const validId = '123456';
    const mockGroup = {
      id: validId,
      group_creator: '123456789012345678901234567890123456789012345678', // 48-character public key
      blockNumber: 1,
      blockHash: '0xblockhash',
      extrinsicHash: '0xextrinsic',
      timestamp: 1700000000, // example timestamp
    };

    await store.group.save(mockGroup as GroupRow);
    const result = await store.group.get(validId);

    expect(result).toBeDefined();
    expect(result?.id).toBe(validId);
    expect(result?.group_creator).toHaveLength(48); // Added check for 48-char length
  });

  test('should prioritize cache over database', async () => {
    const validId = '123456';
    const mockGroup = {
      id: validId,
      group_creator: '123456789012345678901234567890123456789012345678',
      blockNumber: 1,
      blockHash: '0xblockhash',
      extrinsicHash: '0xextrinsic',
      timestamp: 1700000000,
    };

    await store.group.save(mockGroup as GroupRow);

    // Manually change the database value (bypass the API)
    await store.db('group').where('id', validId).update({
      group_creator: 'HACKED_CREATOR' // Simulate a mismatch
    });

    // The 'get' should still return the original name because it's in Redis
    const cachedResult = await store.group.get(validId);
    expect(cachedResult?.group_creator).toBe(mockGroup.group_creator);
  });

  test('should get activities associated with a group', async () => {
    const validId = '123456';
    const mockGroup = {
      id: validId,
      group_creator: '123456789012345678901234567890123456789012345678',
      blockNumber: 1,
      blockHash: '0xblockhash',
      extrinsicHash: '0xextrinsic',
      timestamp: 1700000000,
    };

    await store.group.save(mockGroup as GroupRow);

    const mockActivity: GroupActivityRow = {
      group_id: validId,
      tx_hash: '0xtrans',
    };

    await store.group.saveActivity(mockActivity);

    const result = await store.group.getActivities(validId);
    expect(result).toBeDefined();
    expect(result.length).toBe(1);
  });

  test('should truncate group table and return deleted rows count', async () => {
    const validId = '123456';
    const mockGroup = {
      id: validId,
      group_creator: '123456789012345678901234567890123456789012345678',
      blockNumber: 1,
      blockHash: '0xblockhash',
      extrinsicHash: '0xextrinsic',
      timestamp: 1700000000,
    };

    await store.group.save(mockGroup as GroupRow);

    const deletedRowsCount = await store.group.truncate();
    expect(deletedRowsCount[0]).toBe(1);
    expect(deletedRowsCount[1]).toBe(0);
  });

});