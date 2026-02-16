import Debug from 'debug';
import {StoreContext} from './types';
import {getActivities, getCached, saveActivity, saveCached,} from './utils';
import {NUMBER_PATTERN} from './constants';
import {ProposalActivityRow, ProposalRow} from './dbTypes';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const debug = Debug('be-datastore:Proposal');

export default class Proposal {
  private readonly ctx: StoreContext;

  constructor(ctx: StoreContext) {
    this.ctx = ctx;
  }

  private static keyOf(id: string | number) {
    return `proposal:${id}`;
  }

  /**
   * Saves proposal in Database and Cache with expiry
   */
  async save(proposal: ProposalRow) {
    await saveCached(proposal, this.ctx, {
      tableName: 'proposal',
      idField: 'id',
      keyOf: Proposal.keyOf,
      ttlSeconds: this.ctx.ttlMax,
    });
  }

  /**
   * Saves activities (transactions) associated with an proposal
   */
  async saveActivity(activity: ProposalActivityRow) {
    await saveActivity(activity, this.ctx, {
      tableName: 'proposal_activity',
      parentIdField: 'proposal_id',

    });
  }

  /**
   * Retrieves lease from Cache, if not found in Cache retrieves from Database
   */
  async get(proposalid: string) {
    return getCached(proposalid, this.ctx, {
      isValid: (id) => NUMBER_PATTERN.test(id),
      keyOf: Proposal.keyOf,
      fetchOne: async (id) => {
        const resultSet = await this.ctx.db('proposal').where('id', id);
        return resultSet && resultSet.length > 0 ? resultSet[0] : null;
      },
      ttlSeconds: this.ctx.ttlMax,
    });
  }

  /**
   * Retrieves associated activities (transactions) with proposal
   */
  async getActivities(proposalid: string) {
    return getActivities(proposalid, this.ctx, {
      tableName: 'proposal_activity',
      parentIdField: 'proposal_id',

    });
  }

  /**
   * Truncates table and returns deleted rows count
   */
  async truncate() {
    return Promise.all([
      this.ctx.db('proposal').del(),
      this.ctx.db('proposal_activity').del(),
    ]);
  }
}
