import DataStore from '../../lib/DataStore';
import {
  DefinitionActivityRow,
  DefinitionRow,
  RegistryActivityRow,
  RegistryRow,
  SequenceActivityRow,
  SequenceRow
} from '../../lib/dbTypes';

describe('Provenance Module Integration', () => {
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

  describe('Registry Operations', () => {
    const registryId = '101';
    const mockRegistry: RegistryRow = {
      id: registryId,
      creator: '0xcreator',
      creator_group: 'group_A',
      blockNumber: 1,
      blockHash: '0xblock1',
      extrinsicHash: '0xext1',
      timestamp: 1700000000,
    };

    test('should save and retrieve a registry', async () => {
      await store.provenance.saveRegistry(mockRegistry);
      const result = await store.provenance.getRegistry(registryId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(registryId);
      expect(result?.creator_group).toBe('group_A');
    });

    test('should track registry activities', async () => {
      const activity: RegistryActivityRow = {
        registry_id: registryId,
        tx_hash: '0xreg_tx',
      };

      await store.provenance.saveRegistryActivity(activity);
      const activities = await store.provenance.getRegistryActivities(registryId);

      expect(activities).toHaveLength(1);
      expect(activities[0]).toBe('0xreg_tx');
    });
  });

  describe('Definition Operations', () => {
    const definitionId = '202';
    const mockDefinition: DefinitionRow = {
      id: definitionId,
      registry_id: '101',
      creator: '0xcreator',
      creator_group: 'group_A',
      blockNumber: 2,
      blockHash: '0xblock2',
      extrinsicHash: '0xext2',
      timestamp: 1700000001,
    };

    test('should save and retrieve a definition', async () => {
      await store.provenance.saveDefinition(mockDefinition);
      const result = await store.provenance.getDefinition(definitionId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(definitionId);
      expect(result?.registry_id).toBe('101');
    });

    test('should track definition activities', async () => {
      const activity: DefinitionActivityRow = {
        definition_id: definitionId,
        tx_hash: '0xdef_tx',
      };

      await store.provenance.saveDefinitionActivity(activity);
      const activities = await store.provenance.getDefinitionActivities(definitionId);

      expect(activities).toHaveLength(1);
      expect(activities[0]).toBe('0xdef_tx');
    });
  });

  describe('Sequence Operations', () => {
    const sequenceId = '303';
    const mockSequence: SequenceRow = {
      id: sequenceId,
      name: 'Test Sequence',
      registry: 101,
      template: 5,
      sequence_creator: '0xcreator',
      sequence_creator_group: 'group_A',
      blockNumber: 3,
      blockHash: '0xblock3',
      extrinsicHash: '0xext3',
      timestamp: 1700000002,
    };

    test('should save and retrieve a sequence (provenance)', async () => {
      await store.provenance.save(mockSequence);
      const result = await store.provenance.get(sequenceId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(sequenceId);
      expect(result?.name).toBe('Test Sequence');
    });

    test('should track sequence activities', async () => {
      const activity: SequenceActivityRow = {
        sequence_id: sequenceId,
        tx_hash: '0xseq_tx',
      };

      await store.provenance.saveActivity(activity);
      const activities = await store.provenance.getActivities(sequenceId);

      expect(activities).toHaveLength(1);
      expect(activities[0]).toBe('0xseq_tx');
    });
  });

  test('should truncate sequence tables and return deletion counts', async () => {
    const sequenceId = '303';
    const mockSequence: SequenceRow = {
      id: sequenceId,
      name: 'Test Sequence',
      registry: 101,
      template: 5,
      sequence_creator: '0xcreator',
      sequence_creator_group: 'group_A',
      blockNumber: 3,
      blockHash: '0xblock3',
      extrinsicHash: '0xext3',
      timestamp: 1700000002,
    };
    await store.provenance.save(mockSequence);
    await store.provenance.saveActivity({sequence_id: '999', tx_hash: '0x1'});

    const results = await store.provenance.truncate();

    // results[0] is 'sequence' table, results[1] is 'sequence_activity' table
    expect(results).toHaveLength(2);
    expect(results[0]).toBeGreaterThanOrEqual(1);
    expect(results[1]).toBeGreaterThanOrEqual(1);
  });
});