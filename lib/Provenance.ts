import Debug from 'debug';
import { StoreContext } from './types';
import {
  DefinitionActivityRow,
  DefinitionRow,
  RegistryActivityRow,
  RegistryRow,
  SequenceActivityRow,
  SequenceRow,
} from './dbTypes';
import {
  getActivities, getCached, saveActivity, saveCached,
} from './utils';
import { NUMBER_PATTERN } from './constants';

const debug = Debug('be-datastore:Provenance');

export default class Provenance {
  private readonly ctx: StoreContext;

  constructor(ctx: StoreContext) {
    this.ctx = ctx;
  }

  private static keyOfRegistry(id: string | number) {
    return `registry:${id}`;
  }

  private static keyOfDefinition(id: string | number) {
    return `definition:${id}`;
  }

  private static keyOfSequence(id: string | number) {
    return `sequence:${id}`;
  }

  /**
   * Saves registry in Database and Cache with expiry
   */
  async saveRegistry(registry: RegistryRow) {
    await saveCached<RegistryRow>(registry, this.ctx, {
      tableName: 'registry',
      idField: 'id',
      keyOf: Provenance.keyOfRegistry,
      ttlSeconds: this.ctx.ttlMax,
    });
  }

  /**
   * Saves activities (transactions) associated with an registry
   */
  async saveRegistryActivity(activity: RegistryActivityRow) {
    await saveActivity(activity, this.ctx, {
      tableName: 'registry_activity',
      parentIdField: 'registry_id',
      txHashField: 'tx_hash',
    });
  }

  /**
   * Retrieves registry from Cache, if not found in Cache retrieves from Database
   */
  async getRegistry(registryid: string) {
    return getCached<RegistryRow>(registryid, this.ctx, {
      isValid: (id) => NUMBER_PATTERN.test(id),
      keyOf: Provenance.keyOfRegistry,
      fetchOne: async (id) => {
        const resultSet = await this.ctx.db('registry').where('id', id);
        return resultSet && resultSet.length > 0 ? resultSet[0] : null;
      },
      ttlSeconds: this.ctx.ttlMax,
    });
  }

  /**
   * Retrieves associated activities (transactions) with registry
   */
  async getRegistryActivities(registryid: string) {
    return getActivities(registryid, this.ctx, {
      tableName: 'registry_activity',
      parentIdField: 'registry_id',
      txHashField: 'tx_hash',
    });
  }

  /**
   * Saves definition in Database and Cache with expiry
   */
  async saveDefinition(definition: DefinitionRow) {
    await saveCached(definition, this.ctx, {
      tableName: 'definition',
      idField: 'id',
      keyOf: Provenance.keyOfDefinition,
      ttlSeconds: this.ctx.ttlMax,
    });
  }

  /**
   * Saves activities (transactions) associated with an definition
   */
  async saveDefinitionActivity(activity: DefinitionActivityRow) {
    await saveActivity(activity, this.ctx, {
      tableName: 'definition_activity',
      parentIdField: 'definition_id',
      txHashField: 'tx_hash',
    });
  }

  /**
   * Retrieves definition from Cache, if not found in Cache retrieves from Database
   */
  async getDefinition(definitionid: string) {
    return getCached(definitionid, this.ctx, {
      isValid: (id) => NUMBER_PATTERN.test(id),
      keyOf: Provenance.keyOfDefinition,
      fetchOne: async (id) => {
        const resultSet = await this.ctx.db('definition').where('id', id);
        return resultSet && resultSet.length > 0 ? resultSet[0] : null;
      },
      ttlSeconds: this.ctx.ttlMax,
    });
  }

  /**
   * Retrieves associated activities (transactions) with definition
   */
  async getDefinitionActivities(definitionid: string) {
    return getActivities(definitionid, this.ctx, {
      tableName: 'definition_activity',
      parentIdField: 'definition_id',
      txHashField: 'tx_hash',
    });
  }

  /**
   * Saves provenance in Database and Cache with expiry
   */
  async save(sequence: SequenceRow) {
    debug(sequence);
    await saveCached(sequence, this.ctx, {
      tableName: 'sequence',
      idField: 'id',
      keyOf: Provenance.keyOfSequence,
      ttlSeconds: this.ctx.ttlMax,
    });
  }

  /**
   * Saves activities (transactions) associated with an sequence
   */
  async saveActivity(activity: SequenceActivityRow) {
    await saveActivity(activity, this.ctx, {
      tableName: 'sequence_activity',
      parentIdField: 'sequence_id',
      txHashField: 'tx_hash',
    });
  }

  /**
   * Retrieves lease from Cache, if not found in Cache retrieves from Database
   */
  async get(sequenceid: string) {
    return getCached(sequenceid, this.ctx, {
      isValid: (id) => NUMBER_PATTERN.test(id),
      keyOf: Provenance.keyOfSequence,
      fetchOne: async (id) => {
        const resultSet = await this.ctx.db('sequence').where('id', id);
        return resultSet && resultSet.length > 0 ? resultSet[0] : null;
      },
      ttlSeconds: this.ctx.ttlMax,
    });
  }

  /**
   * Retrieves associated activities (transactions) with sequence
   */
  async getActivities(sequenceid: string) {
    return getActivities(sequenceid, this.ctx, {
      tableName: 'sequence_activity',
      parentIdField: 'sequence_id',
      txHashField: 'tx_hash',
    });
  }

  /**
   * Truncates table and returns deleted rows count
   */
  async truncate() {
    return Promise.all([
      this.ctx.db('sequence').del(),
      this.ctx.db('sequence_activity').del(),
    ]);
  }
}
