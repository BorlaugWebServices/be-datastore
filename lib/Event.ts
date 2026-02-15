import Debug from 'debug';
import {
  getCached, getListCached, getTTL, saveCached,
} from './utils';
import { StoreContext } from './types';
import { EventRow } from './dbTypes';
import { ID_PATTERN } from './constants';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const debug = Debug('be-datastore:Event');

export default class Event {
  private readonly ctx: StoreContext;

  constructor(ctx: StoreContext) {
    this.ctx = ctx;
  }

  private static keyOf(id: string) {
    return `evn:${id}`;
  }

  /**
   * Saves event in Database and Cache with expiry
   */
  async save(event: EventRow) {
    await saveCached<EventRow>(event, this.ctx, {
      tableName: 'event',
      idField: 'id',
      keyOf: Event.keyOf,
      ttlSeconds: (e) => getTTL(e, this.ctx),
    });
  }

  /**
   * Retrieves event from Cache, if not found in Cache retrieves from Database
   */
  async get(eventId: string) {
    return getCached<EventRow>(eventId, this.ctx, {
      isValid: (id) => ID_PATTERN.test(id),
      keyOf: Event.keyOf,
      fetchOne: async (id) => {
        const resultSet = await this.ctx.db('event').where('id', id);
        return resultSet && resultSet.length > 0 ? resultSet[0] : null;
      },
      ttlSeconds: (e) => getTTL(e, this.ctx),
    });
  }

  /**
   * Retrieves n events from Cache, if not found in Cache retrieves from Database; n is length of eventids
   */
  async getList(eventids: string[]) {
    return getListCached<EventRow>(eventids, {
      ctx: this.ctx,
      keyOf: Event.keyOf,
      getOne: (id) => this.get(id),
    });
  }

  /**
   * Truncates table and returns deleted rows count
   */
  async truncate() {
    return this.ctx.db('event').del();
  }
}
