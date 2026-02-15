import DataStore from '../../lib/DataStore';
import {ProposalActivityRow, ProposalRow} from "../../lib/dbTypes";

describe('Proposal Module Integration', () => {
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

  test('should save and retrieve a proposal by id', async () => {
    const validId = '1001';
    const mockProposal: ProposalRow = {
      id: validId,
      proposer: '0xproposer_address',
      group_id: 'group_123',
      blockNumber: 500,
      blockHash: '0xblockhash',
      extrinsicHash: '0xextrinsichash',
      timestamp: 1700000000,
    };

    await store.proposal.save(mockProposal);
    const result = await store.proposal.get(validId);

    expect(result).toBeDefined();
    expect(result?.id).toBe(validId);
    expect(result?.proposer).toBe('0xproposer_address');
    expect(result?.group_id).toBe('group_123');
  });

  test('should prioritize cache over database for proposals', async () => {
    const validId = '1002';
    const mockProposal: ProposalRow = {
      id: validId,
      proposer: '0xoriginal_proposer',
      group_id: 'group_123',
      blockNumber: 501,
      blockHash: '0xblockhash',
      extrinsicHash: '0xextrinsichash',
      timestamp: 1700000000,
    };

    await store.proposal.save(mockProposal);

    // Manually change the database value to simulate cache priority
    await store.db('proposal').where('id', validId).update({
      proposer: '0xmodified_proposer'
    });

    const cachedResult = await store.proposal.get(validId);
    // Should return original value from Redis cache
    expect(cachedResult?.proposer).toBe('0xoriginal_proposer');
  });

  test('should get activities associated with a proposal', async () => {
    const validId = '1003';
    const mockProposal: ProposalRow = {
      id: validId,
      proposer: '0xproposer',
      group_id: 'group_123',
      blockNumber: 502,
      blockHash: '0xhash',
      extrinsicHash: '0xext',
      timestamp: 1700000000,
    };

    await store.proposal.save(mockProposal);

    const mockActivity: ProposalActivityRow = {
      proposal_id: validId,
      tx_hash: '0xproposal_tx_hash',
    };

    await store.proposal.saveActivity(mockActivity);

    const result = await store.proposal.getActivities(validId);
    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(result[0]).toBe('0xproposal_tx_hash');
  });

  test('should return null for invalid proposal id format', async () => {
    // Proposal.ts uses NUMBER_PATTERN.test(id) for validation
    const invalidId = 'abc_invalid';
    const result = await store.proposal.get(invalidId);
    expect(result).toBeNull();
  });

  test('should truncate proposal tables and return deleted rows count', async () => {
    const mockProposal: ProposalRow = {
      id: '1004',
      proposer: '0xproposer',
      group_id: 'group_123',
      blockNumber: 503,
      blockHash: '0xhash',
      extrinsicHash: '0xext',
      timestamp: 1700000000,
    };

    await store.proposal.save(mockProposal);
    await store.proposal.saveActivity({
      proposal_id: '1004',
      tx_hash: '0xtx'
    });

    const deletedRowsCount = await store.proposal.truncate();

    // Results from Promise.all([db('proposal').del(), db('proposal_activity').del()])
    expect(deletedRowsCount).toHaveLength(2);
    expect(deletedRowsCount[0]).toBeGreaterThanOrEqual(1); // Deleted from proposal table
    expect(deletedRowsCount[1]).toBeGreaterThanOrEqual(1); // Deleted from proposal_activity table
  });
});