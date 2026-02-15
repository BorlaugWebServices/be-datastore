import DataStore from '../../lib/DataStore';
import {CatalogActivityRow, CatalogRow, IdentityActivityRow, IdentityRow} from '../../lib/dbTypes';

describe('Identity Module Integration', () => {
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

  describe('Identity Operations', () => {
    const mockDid = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    // Updated to match IdentityRow definition
    const mockIdentity: IdentityRow = {
      did: mockDid,
      subject: '0xsubject_address',
      controller: '0xcontroller_address',
      blockNumber: 100,
      blockHash: '0xblockhash',
      extrinsicHash: '0xextrinsichash',
      timestamp: 1700000000,
    };

    test('should save and retrieve an identity by DID', async () => {
      await store.identity.save(mockIdentity);

      const result = await store.identity.get(mockDid);
      expect(result).toBeDefined();
      expect(result?.did).toBe(mockDid);
      expect(result?.subject).toBe('0xsubject_address');
    });

    test('should handle DID normalization (did:bws: prefix)', async () => {
      await store.identity.save(mockIdentity);

      // Testing the DID_PATTERN logic in Identity.ts
      const bwsFormat = `did:bws:${mockDid.replace('0x', '')}`;
      const result = await store.identity.get(bwsFormat);

      expect(result).toBeDefined();
      expect(result?.did).toBe(mockDid);
    });

    test('should track identity activities', async () => {
      await store.identity.save(mockIdentity);

      const activity: IdentityActivityRow = {
        did: mockDid,
        tx_hash: '0xtx123'
      };

      await store.identity.saveActivity(activity);
      const activities = await store.identity.getActivities(mockDid);

      expect(activities).toHaveLength(1);
      expect(activities[0]).toBe('0xtx123');
    });
  });

  describe('Catalog Operations', () => {
    const catalogId = '101';

    // Updated to match CatalogRow definition
    const mockCatalog: CatalogRow = {
      id: catalogId,
      caller: '0xcaller',
      controller: '0xcontroller',
      blockNumber: 50,
      blockHash: '0xblock',
      extrinsicHash: '0xextrinsic',
      timestamp: 1700000000,
    };

    test('should save and retrieve a catalog', async () => {
      await store.identity.save_catalog(mockCatalog);

      const result = await store.identity.get_catalog(catalogId);
      expect(result).toBeDefined();
      expect(result?.id).toBe(catalogId);
      expect(result?.caller).toBe('0xcaller');
    });

    test('should track catalog activities', async () => {
      await store.identity.save_catalog(mockCatalog);


      const activity: CatalogActivityRow = {
        catalog_id: catalogId,
        tx_hash: '0xcatalog_tx'
      };

      await store.identity.saveCatalogActivity(activity);
      const activities = await store.identity.getCatalogActivities(catalogId);

      expect(activities).toHaveLength(1);
      expect(activities[0]).toBe(activity.tx_hash);
    });
  });

  test('should truncate identity tables and return deletion counts', async () => {
    await store.identity.save({
      did: '0x1', subject: 's', blockNumber: 1, blockHash: 'h', extrinsicHash: 'e', timestamp: 1
    } as IdentityRow);

    const results = await store.identity.truncate();

    // Identity.ts truncate() returns Promise.all for 'identity' and 'identity_activity'
    expect(results).toHaveLength(2);
    expect(results[0]).toBeGreaterThanOrEqual(0);
  });
});