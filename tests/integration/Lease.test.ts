import DataStore from '../../lib/DataStore';
import {
  AssetActivityRow,
  AssetRegistryActivityRow,
  AssetRegistryRow,
  AssetRow,
  LeaseActivityRow,
  LeaseRow
} from '../../lib/dbTypes';

describe('Lease Module Integration', () => {
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

  describe('Lease Operations', () => {
    const leaseId = '303';

    // Exact match for the LeaseRow type
    const mockLease: LeaseRow = {
      id: leaseId,
      lessor: '0xlessor_address',
      lessee: '0xlessee_address',
      blockNumber: 10,
      blockHash: '0xblock_lease',
      extrinsicHash: '0xextrinsic_lease',
      timestamp: 1700000002,
    };

    test('should save and retrieve a lease by id', async () => {
      await store.lease.saveLease(mockLease);

      const result = await store.lease.getLease(leaseId);
      expect(result).toBeDefined();
      expect(result?.id).toBe(leaseId);
      expect(result?.lessor).toBe('0xlessor_address');
      expect(result?.lessee).toBe('0xlessee_address');
    });

    test('should track lease activities', async () => {
      await store.lease.saveLease(mockLease);

      const activity: LeaseActivityRow = {
        lease_id: leaseId,
        tx_hash: '0xlease_action_hash',
      };

      await store.lease.saveLeaseActivity(activity);
      const activities = await store.lease.getLeaseActivities(leaseId);

      expect(activities).toHaveLength(1);
      expect(activities[0]).toBe('0xlease_action_hash');
    });
  });

  describe('Asset Registry Operations', () => {
    const registryId = '101';

    // Matches AssetRegistryRow in dbTypes.ts
    // Note: Lease.ts uses RegistryRow in the signature but target table is asset_registry
    const mockRegistry: AssetRegistryRow = {
      id: registryId,
      owner: '0xowner_address',
      blockNumber: 5,
      blockHash: '0xblock_reg',
      extrinsicHash: '0xextrinsic_reg',
      timestamp: 1700000000,
    };

    test('should save and retrieve an asset registry', async () => {
      // Cast to any because Lease.ts saveRegistry signature uses RegistryRow
      // but writes to asset_registry table
      await store.lease.saveRegistry(mockRegistry as any);

      const result = await store.lease.getRegistry(registryId);
      expect(result).toBeDefined();
      expect(result?.id).toBe(registryId);
    });

    test('should track registry activities', async () => {
      const activity: AssetRegistryActivityRow = {
        registry_id: registryId,
        tx_hash: '0xreg_tx_hash',
      };

      await store.lease.saveRegistryActivity(activity);
      const activities = await store.lease.getRegistryActivities(registryId);

      expect(activities).toHaveLength(1);
      expect(activities[0]).toBe('0xreg_tx_hash');
    });
  });

  describe('Asset Operations', () => {
    const assetId = '202';

    // Matches AssetRow in dbTypes.ts
    const mockAsset: AssetRow = {
      id: assetId,
      registry_id: '101',
      blockNumber: 8,
      blockHash: '0xblock_asset',
      extrinsicHash: '0xextrinsic_asset',
      timestamp: 1700000001,
    };

    test('should save and retrieve an asset', async () => {
      await store.lease.saveAsset(mockAsset);

      const result = await store.lease.getAsset(assetId);
      expect(result).toBeDefined();
      expect(result?.id).toBe(assetId);
      expect(result?.registry_id).toBe('101');
    });

    test('should track asset activities', async () => {
      const activity: AssetActivityRow = {
        asset_id: assetId,
        tx_hash: '0xasset_tx_hash',
      };

      await store.lease.saveAssetActivity(activity);
      const activities = await store.lease.getAssetActivities(assetId);

      expect(activities).toHaveLength(1);
      expect(activities[0]).toBe('0xasset_tx_hash');
    });
  });

  test('should truncate lease tables and return deletion counts', async () => {
    // Ensuring required fields are present for valid insertion
    await store.lease.saveLease({
      id: '999',
      lessor: '0x1',
      lessee: '0x2',
      blockNumber: 1,
      blockHash: '0xhash',
      extrinsicHash: '0xext',
      timestamp: 12345
    } as LeaseRow);

    const results = await store.lease.truncate();

    // Lease.ts truncate() targets 'lease' and 'lease_activity'
    expect(results).toHaveLength(2);
    expect(results[0]).toBeGreaterThanOrEqual(1);
  });
});