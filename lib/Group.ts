import Debug from 'debug';
import {
  getActivities, getCached, saveActivity, saveCached,
} from './utils';
import { StoreContext } from './types';
import { GroupActivityRow, GroupRow } from './dbTypes';
import { NUMBER_PATTERN } from './constants';

const debug = Debug('be-datastore:Group');

export default class Group {
  private readonly ctx: StoreContext;

  constructor(ctx: StoreContext) {
    this.ctx = ctx;
  }

  private static keyOf(id: string | number) {
    return `group:${id}`;
  }

  /**
   * Saves group in Database and Cache with expiry
   */
  async save(group: GroupRow) {
    debug(group);
    await saveCached<GroupRow>(group, this.ctx, {
      tableName: 'group',
      idField: 'id',
      keyOf: Group.keyOf,
      ttlSeconds: this.ctx.ttlMax,
    });
  }

  /**
   * Saves activities (transactions) associated with an group
   */
  async saveActivity(activity: any) {
    await saveActivity(activity, this.ctx, {
      tableName: 'group_activity',
      parentIdField: 'group_id',
      txHashField: 'tx_hash',
    });
  }

  async get(groupid: string) {
    return getCached<GroupRow>(
      groupid,
      this.ctx,
      {
        isValid: (x) => NUMBER_PATTERN.test(x),
        keyOf: Group.keyOf,
        fetchOne: async (x) => {
          const rows = await this.ctx.db('group').where('id', x);
          return rows?.length ? rows[0] : null;
        },
        ttlSeconds: this.ctx.ttlMax,
      },
    );
  }

  /**
   * Retrieves associated activities (transactions) with group
   */
  async getActivities(groupid: string) {
    return getActivities<GroupActivityRow>(groupid, this.ctx, {
      tableName: 'group_activity',
      parentIdField: 'group_id',
      txHashField: 'tx_hash',
    });
  }

  /**
   * Truncates table and returns deleted rows count
   */
  async truncate() {
    return Promise.all([
      this.ctx.db('group').del(),
      this.ctx.db('group_activity').del(),
    ]);
  }
}
