import Debug from 'debug';
import {StoreContext} from './types';
import {AuditActivityRow, AuditRow} from './dbTypes';
import {NUMBER_PATTERN} from './constants';
import {getActivities, getCached, saveActivity, saveCached,} from './utils';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const debug = Debug('be-datastore:Audit');

export default class Audit {
  private readonly ctx: StoreContext;

  constructor(ctx: StoreContext) {
    this.ctx = ctx;
  }

  private static keyOf(id: string | number) {
    return `audit:${id}`;
  }

  /**
   * Saves audit in Database and Cache with expiry
   */
  async save(audit: AuditRow) {
    await saveCached<AuditRow>(audit, this.ctx, {
      tableName: 'audit',
      idField: 'id',
      keyOf: Audit.keyOf,
      ttlSeconds: this.ctx.ttlMax,
    });
  }

  /**
   * Saves activities (transactions) associated with an audit
   */
  async saveActivity(activity: AuditActivityRow) {
    await saveActivity<AuditActivityRow>(activity, this.ctx, {
      tableName: 'audit_activity',
      parentIdField: 'audit_id',

    });
  }

  /**
   * Retrieves lease from Cache, if not found in Cache retrieves from Database
   */
  async get(auditid: string) {
    return getCached<AuditRow>(auditid, this.ctx, {
      isValid: (id) => NUMBER_PATTERN.test(id),
      keyOf: Audit.keyOf,
      fetchOne: async (id) => {
        const resultSet = await this.ctx.db('audit').where('id', id);
        return resultSet && resultSet.length > 0 ? resultSet[0] : null;
      },
      ttlSeconds: this.ctx.ttlMax,
    });
  }

  /**
   * Retrieves associated activities (transactions) with audit
   */
  async getActivities(auditid: string) {
    return getActivities<AuditActivityRow>(auditid, this.ctx, {
      tableName: 'audit_activity',
      parentIdField: 'audit_id'
    });
  }

  /**
   * Truncates table and returns deleted rows count
   */
  async truncate() {
    return Promise.all([
      this.ctx.db('audit').del(),
      this.ctx.db('audit_activity').del(),
    ]);
  }
}
