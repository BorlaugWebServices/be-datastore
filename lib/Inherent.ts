import Debug from 'debug';
import {FullInherent, StoreContext} from './types';
import {getCached, getListCached, saveCached} from './utils';
import {ID_PATTERN} from './constants';
import {InherentRow} from './dbTypes';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const debug = Debug('be-datastore:Inherent');

export default class Inherent {
  private readonly ctx: StoreContext;

  constructor(ctx: StoreContext) {
    this.ctx = ctx;
  }

  private static keyOf(id: string) {
    return `inh:${id}`;
  }

  static async fetchOne(ctx: StoreContext, id: string) {
    const resultSet = await ctx.db('inherent').where('id', id);
    const inherent = resultSet && resultSet.length > 0 ? resultSet[0] : null;
    if (inherent) {
      inherent.events = (await ctx.db('event').select('id').where('extrinsicid', inherent.id)).map((event: any) => event.id);
    }
    return inherent;
  }

  /**
   * Saves inherent in Database and Cache with expiry
   */

  async save(inherent: FullInherent) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {events, ...dbInherent} = inherent;
    await saveCached(inherent, this.ctx, {
      tableName: 'inherent',
      idField: 'id',
      keyOf: Inherent.keyOf,
      ttlSeconds: inherent.significant ? this.ctx.ttlMax : this.ctx.ttlMin,
      dbData: dbInherent,
    });
  }

  /**
   * Retrieves inherent from Cache, if not found in Cache retrieves from Database
   */
  async get(inherentid: string) {
    return getCached(inherentid, this.ctx, {
      isValid: (id) => ID_PATTERN.test(id),
      keyOf: Inherent.keyOf,
      fetchOne: (id) => Inherent.fetchOne(this.ctx, id),
      ttlSeconds: (inherent) => (inherent.significant ? this.ctx.ttlMax : this.ctx.ttlMin),
    });
  }

  /**
   * Retrieves n inherents from Cache, if n inherents are not found in Cache then retrieves from Database; n is length of inherentids
   */
  async getList(eventids: string[]) {
    return getListCached<InherentRow>(eventids, {
      ctx: this.ctx,
      keyOf: Inherent.keyOf,
      getOne: (id) => this.get(id),
    });
  }

  /**
   * Truncates table and returns deleted rows count
   */
  async truncate() {
    return this.ctx.db('inherent').del();
  }
}
