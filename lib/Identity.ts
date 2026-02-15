import Debug from 'debug';
import { StoreContext } from './types';
import { CatalogActivityRow, CatalogRow, IdentityRow } from './dbTypes';
import {
  getActivities, getCached, saveActivity, saveCached,
} from './utils';
import {
  DID_PATTERN, HASH_PATTERN, HASH_PATTERN_2, NUMBER_PATTERN,
} from './constants';

const debug = Debug('be-datastore:Identity');

export default class Identity {
  private readonly ctx: StoreContext;

  constructor(ctx: StoreContext) {
    this.ctx = ctx;
  }

  private static keyOf(id: string | number) {
    return `did:bws:${id}`;
  }

  private static keyOfCatalog(id: string | number) {
    return `catalog:${id}`;
  }

  /**
   * Saves identities in Database and Cache with expiry
   */
  async save(identity: IdentityRow | any) {
    await saveCached(identity, this.ctx, {
      tableName: 'identity',
      idField: 'did',
      keyOf: Identity.keyOf,
      ttlSeconds: this.ctx.ttlMax,
    });
  }

  /**
   * Saves catalog in Database and Cache with expiry
   */
  async save_catalog(catalog: CatalogRow) {
    await saveCached<CatalogRow>(catalog, this.ctx, {
      tableName: 'catalog',
      idField: 'id',
      keyOf: Identity.keyOfCatalog,
      ttlSeconds: this.ctx.ttlMax,
    });
  }

  /**
   * Saves activities (transactions) associated with a catalog
   */
  async saveCatalogActivity(activity: CatalogActivityRow) {
    await saveActivity<CatalogActivityRow>(activity, this.ctx, {
      tableName: 'catalog_activity',
      parentIdField: 'catalog_id',
      txHashField: 'tx_hash',
    });
  }

  /**
   * Retrieves catalog from Cache, if not found in Cache retrieves from Database
   */
  async get_catalog(catalogid: string) {
    return getCached<CatalogRow>(catalogid, this.ctx, {
      isValid: (id) => NUMBER_PATTERN.test(id),
      keyOf: Identity.keyOfCatalog,
      fetchOne: async (id) => {
        const resultSet = await this.ctx.db('catalog').where('id', id);
        return resultSet && resultSet.length > 0 ? resultSet[0] : null;
      },
      ttlSeconds: this.ctx.ttlMax,
    });
  }

  /**
   * Saves activities (transactions) associated with a lease
   */
  async saveActivity(activity: any) {
    await saveActivity(activity, this.ctx, {
      tableName: 'identity_activity',
      parentIdField: 'did',
      txHashField: 'tx_hash',
    });
  }

  /**
   * Retrieves identity from Cache, if not found in Cache retrieves from Database
   */
  async get(did: string) {
    let normalizedDid: any = null;
    if (DID_PATTERN.test(did)) {
      normalizedDid = `0x${did.split(':')[2]}`;
    } else if (HASH_PATTERN.test(did)) {
      normalizedDid = did;
    } else if (HASH_PATTERN_2.test(did)) {
      normalizedDid = `0x${did}`;
    } else {
      debug('Invalid did %s ;', did);
      return null;
    }

    return getCached(normalizedDid, this.ctx, {
      keyOf: Identity.keyOf,
      fetchOne: async (id) => {
        const resultSet = await this.ctx.db('identity').where('did', id);
        return resultSet && resultSet.length > 0 ? resultSet[0] : null;
      },
      ttlSeconds: this.ctx.ttlMax,
    });
  }

  /**
   * Retrieves associated activities (transactions) with identity
   */
  async getCatalogActivities(id: string) {
    return getActivities<CatalogActivityRow>(id, this.ctx, {
      tableName: 'catalog_activity',
      parentIdField: 'catalog_id',
      txHashField: 'tx_hash',
    });
  }

  /**
   * Retrieves associated activities (transactions) with identity
   */
  async getActivities(did: string) {
    return getActivities(did, this.ctx, {
      tableName: 'identity_activity',
      parentIdField: 'did',
      txHashField: 'tx_hash',
    });
  }

  /**
   * Truncates table and returns deleted rows count
   */
  async truncate() {
    return Promise.all([
      this.ctx.db('identity').del(),
      this.ctx.db('identity_activity').del(),
    ]);
  }
}
