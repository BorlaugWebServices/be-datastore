import Debug from 'debug';
import { StoreContext } from './types';
import {
  AssetActivityRow, AssetRow, LeaseActivityRow, LeaseRow, RegistryActivityRow, RegistryRow,
} from './dbTypes';
import {
  getActivities, getCached, saveActivity, saveCached,
} from './utils';
import { NUMBER_PATTERN } from './constants';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const debug = Debug('be-datastore:Lease');

export default class Lease {
  private readonly ctx: StoreContext;

  constructor(ctx: StoreContext) {
    this.ctx = ctx;
  }

  private static keyOfRegistry(id: string | number) {
    return `asset_registry:${id}`;
  }

  private static keyOfAsset(id: string | number) {
    return `asset:${id}`;
  }

  private static keyOfLease(id: string | number) {
    return `lease:${id}`;
  }

  /**
   * Saves asset registry in Database and Cache
   */
  async saveRegistry(registry: RegistryRow) {
    await saveCached<RegistryRow>(registry, this.ctx, {
      tableName: 'asset_registry',
      idField: 'id',
      keyOf: Lease.keyOfRegistry,
      ttlSeconds: this.ctx.ttlMax,
    });
  }

  /**
   * Saves activities (transactions) associated with a asset registry
   */
  async saveRegistryActivity(activity: RegistryActivityRow) {
    await saveActivity<RegistryActivityRow>(activity, this.ctx, {
      tableName: 'asset_registry_activity',
      parentIdField: 'registry_id',
      txHashField: 'tx_hash',
    });
  }

  /**
   * Retrieves lease from Cache, if not found in Cache retrieves from Database
   */
  async getRegistry(registryid: string) {
    return getCached<RegistryRow>(registryid, this.ctx, {
      isValid: (id) => NUMBER_PATTERN.test(id),
      keyOf: Lease.keyOfRegistry,
      fetchOne: async (id) => {
        const resultSet = await this.ctx.db('asset_registry').where('id', id);
        return resultSet && resultSet.length > 0 ? resultSet[0] : null;
      },
      ttlSeconds: this.ctx.ttlMax,
    });
  }

  /**
   * Retrieves associated activities (transactions) with lease
   */
  async getRegistryActivities(registryid: string) {
    return getActivities<RegistryActivityRow>(registryid, this.ctx, {
      tableName: 'asset_registry_activity',
      parentIdField: 'registry_id',
      txHashField: 'tx_hash',
    });
  }

  /**
   * Saves asset asset in Database and Cache
   */
  async saveAsset(asset: AssetRow) {
    await saveCached(asset, this.ctx, {
      tableName: 'asset',
      idField: 'id',
      keyOf: Lease.keyOfAsset,
      ttlSeconds: this.ctx.ttlMax,
    });
  }

  /**
   * Saves activities (transactions) associated with a asset
   */
  async saveAssetActivity(activity: AssetActivityRow) {
    await saveActivity(activity, this.ctx, {
      tableName: 'asset_activity',
      parentIdField: 'asset_id',
      txHashField: 'tx_hash',
    });
  }

  /**
   * Retrieves asset from Cache, if not found in Cache retrieves from Database
   */
  async getAsset(assetid: string) {
    return getCached(assetid, this.ctx, {
      isValid: (id) => NUMBER_PATTERN.test(id),
      keyOf: Lease.keyOfAsset,
      fetchOne: async (id) => {
        const resultSet = await this.ctx.db('asset').where('id', id);
        return resultSet && resultSet.length > 0 ? resultSet[0] : null;
      },
      ttlSeconds: this.ctx.ttlMax,
    });
  }

  /**
   * Retrieves associated activities (transactions) with asset
   */
  async getAssetActivities(assetid: string) {
    return getActivities(assetid, this.ctx, {
      tableName: 'asset_activity',
      parentIdField: 'asset_id',
      txHashField: 'tx_hash',
    });
  }

  /**
   * Saves lease in Database and Cache
   */
  async saveLease(lease: LeaseRow) {
    await saveCached(lease, this.ctx, {
      tableName: 'lease',
      idField: 'id',
      keyOf: Lease.keyOfLease,
      ttlSeconds: this.ctx.ttlMax,
    });
  }

  /**
   * Saves activities (transactions) associated with a lease
   */
  async saveLeaseActivity(activity: LeaseActivityRow) {
    await saveActivity(activity, this.ctx, {
      tableName: 'lease_activity',
      parentIdField: 'lease_id',
      txHashField: 'tx_hash',
    });
  }

  /**
   * Retrieves lease from Cache, if not found in Cache retrieves from Database
   */
  async getLease(leaseid: string) {
    return getCached(leaseid, this.ctx, {
      isValid: (id) => NUMBER_PATTERN.test(id),
      keyOf: Lease.keyOfLease,
      fetchOne: async (id) => {
        const resultSet = await this.ctx.db('lease').where('id', id);
        return resultSet && resultSet.length > 0 ? resultSet[0] : null;
      },
      ttlSeconds: this.ctx.ttlMax,
    });
  }

  /**
   * Retrieves associated activities (transactions) with lease
   */
  async getLeaseActivities(leaseid: string) {
    return getActivities(leaseid, this.ctx, {
      tableName: 'lease_activity',
      parentIdField: 'lease_id',
      txHashField: 'tx_hash',
    });
  }

  /**
   * Truncates table and returns deleted rows count
   */
  async truncate() {
    return Promise.all([
      this.ctx.db('lease').del(),
      this.ctx.db('lease_activity').del(),
    ]);
  }
}
