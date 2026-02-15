import Debug from 'debug';
import { StoreContext } from './types';
import { LogRow } from './dbTypes';
import { getCached, saveCached } from './utils';
import { ID_PATTERN } from './constants';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const debug = Debug('be-datastore:Log');

export default class Log {
  private readonly ctx: StoreContext;

  constructor(ctx: StoreContext) {
    this.ctx = ctx;
  }

  private static keyOf(id: string | number) {
    return `log:${id}`;
  }

  static async fetchOne(ctx: StoreContext, id: string) {
    const resultSet = await ctx.db('log').where('id', id);
    return resultSet && resultSet.length > 0 ? resultSet[0] : null;
  }

  /**
   * Saves log in Database and Cache with expiry
   */
  async save(log: LogRow) {
    await saveCached<LogRow>(log, this.ctx, {
      tableName: 'log',
      idField: 'id',
      keyOf: Log.keyOf,
      ttlSeconds: log.significant ? this.ctx.ttlMax : this.ctx.ttlMin,
    });
  }

  /**
   * Retrieves log from Cache, if not found in Cache then retrieves from Database

   */
  async get(logid: string) {
    return getCached<LogRow>(logid, this.ctx, {
      isValid: (id) => ID_PATTERN.test(id),
      keyOf: Log.keyOf,
      fetchOne: (id) => Log.fetchOne(this.ctx, id),
      ttlSeconds: (log) => (log.significant ? this.ctx.ttlMax : this.ctx.ttlMin),
    });
  }

  /**
   * Retrieves n logs from Cache, if n logs are not found in Cache then retrieves from Database; n is length of logids
   */
  async getList(logids: string[]) {
    const keys = logids.map((logid) => Log.keyOf(logid));
    let logs: any[] = keys.length > 0 ? await this.ctx.redis.mget(keys) : [];
    logs = logs.filter((x) => x !== null);

    if (logs.length === keys.length) {
      logs = logs.map((x) => JSON.parse(x as string));
    } else {
      logs = await this.ctx.db('log').whereIn('id', logids);
      logs.map(async (row: any) => {
        await this.ctx.redis.set(Log.keyOf(row.id), JSON.stringify(row), 'EX', this.ctx.ttlMin);
      });
    }
    return logs;
  }

  /**
   * Truncates table and returns deleted rows count
   */
  async truncate() {
    return this.ctx.db('log').del();
  }
}
