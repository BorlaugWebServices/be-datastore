import DataStore from '../../lib/DataStore';
import {EventRow} from "../../lib/dbTypes";
import {FullTransaction} from "../../lib/types";

describe('Transaction Module Integration', () => {
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
    // Clear the specific Redis key used for tracking block numbers
    await store.cache.del('latestTxBlockNumber');
  });

  afterAll(async () => {
    await store.db.destroy();
    if (store.cache.disconnect) await store.cache.disconnect();
  });

  const mockHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const mockAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

  const createMockTx = (hash: string, blockNumber: number, signer: string): FullTransaction => ({
    hash,
    id: `block-${blockNumber}-1`,
    index: 1,
    blockNumber,
    nonce: '1',
    signature: '0xsig',
    signer,
    isSigned: true,
    method: {section: 'balances', method: 'transfer'},
    era: {Immortal: true},
    tip: '0',
    timestamp: 1700000000,
    events: []
  });

  test('should save and retrieve a transaction with its events', async () => {
    const tx = createMockTx(mockHash, 100, mockAddress);

    tx.events = ['event-1']

    // 1. Save the transaction
    await store.transaction.save(tx);

    // 2. Manually insert a mock event to verify the event-linking logic in get()
    await store.db('event').insert({
      id: 'event-1',
      extrinsicid: tx.id,
      blockNumber: 100,
      timestamp: 1700000000
    } as EventRow);

    // 3. Retrieve
    const result = await store.transaction.get(mockHash);

    expect(result).toBeDefined();
    expect(result?.hash).toBe(mockHash);
    expect(result?.signer).toBe(mockAddress);
    expect(result?.events).toContain('event-1');
  });

  test('should handle list retrieval (getList)', async () => {
    const hash2 = mockHash.replace('def', '000');
    const tx1 = createMockTx(mockHash, 101, mockAddress);
    const tx2 = createMockTx(hash2, 102, mockAddress);

    await store.transaction.save(tx1);
    await store.transaction.save(tx2);

    const list = await store.transaction.getList([mockHash, hash2]);
    expect(list).toHaveLength(2);
    expect(list.map(t => t?.hash)).toContain(mockHash);
    expect(list.map(t => t?.hash)).toContain(hash2);
  });

  test('should provide paginated results (getPage)', async () => {
    // Create 3 transactions
    for (let i = 1; i <= 3; i++) {
      const hash = mockHash.slice(0, -1) + i;
      await store.transaction.save(createMockTx(hash, 200 + i, mockAddress));
    }

    const page = await store.transaction.getPage(0, 2);

    expect(page.total).toBe("3"); // Knex count often returns string
    expect(page.slice).toHaveLength(2);
    // Should be ordered by blockNumber desc
    expect(page.slice[0].blockNumber).toBe(203);
  });

  test('should filter transactions by signer address', async () => {
    const otherAddress = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92nuUsFvu7JJ';

    await store.transaction.save(createMockTx(mockHash, 301, mockAddress));
    await store.transaction.save(createMockTx(mockHash.replace('f', '0'), 302, otherAddress));

    const result = await store.transaction.getTxnByAddress(0, 10, mockAddress);

    expect(result?.total).toBe("1");
    expect(result?.slice[0].signer).toBe(mockAddress);
  });

  test('should aggregate and paginate unique signers', async () => {
    const addr1 = mockAddress;
    const addr2 = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92nuUsFvu7JJ';

    // 2 Txs for addr1, 1 Tx for addr2
    await store.transaction.save(createMockTx(mockHash.replace('f', '1'), 401, addr1));
    await store.transaction.save(createMockTx(mockHash.replace('f', '2'), 402, addr1));
    await store.transaction.save(createMockTx(mockHash.replace('f', '3'), 403, addr2));

    const signersResult = await store.transaction.getSigners(0, 10);

    expect(signersResult.total).toBe(2); // Two unique signers
    const signers = signersResult.slice.map((s: any) => s.signer);
    expect(signers).toContain(addr1);
    expect(signers).toContain(addr2);
  });

  test('should track the latest block number in Redis', async () => {
    await store.transaction.save(createMockTx(mockHash, 500, mockAddress));

    // Internal method check
    let latest = await store.transaction.latestTxBlockNumber();
    expect(latest).toBe(500);

    // Save a lower block, shouldn't update Redis
    await store.transaction.save(createMockTx(mockHash.replace('f', 'a'), 499, mockAddress));
    latest = await store.transaction.latestTxBlockNumber();
    expect(latest).toBe(500);

    // Save a higher block, should update Redis
    await store.transaction.save(createMockTx(mockHash.replace('f', 'b'), 501, mockAddress));
    latest = await store.transaction.latestTxBlockNumber();
    expect(latest).toBe(501);
  });

  test('should truncate the transaction table', async () => {
    await store.transaction.save(createMockTx(mockHash, 600, mockAddress));

    const count = await store.transaction.truncate();
    await store.clearCache();

    expect(Number(count)).toBe(1);

    const result = await store.transaction.get(mockHash);
    expect(result).toBeNull();
  });
});