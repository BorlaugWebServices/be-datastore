import Debug from 'debug';
import { getListCached, saveCached } from './utils';
import { FullBlock, StoreContext } from './types';
import { BlockRow } from './dbTypes';
import { HASH_PATTERN, NUMBER_PATTERN } from './constants';

const debug = Debug('be-datastore:Block');

export default class Block {
  private readonly ctx: StoreContext;

  constructor(ctx: StoreContext) {
    this.ctx = ctx;
  }

  private static keyOf(id: string | number) {
    return `block:${id}`;
  }

  /**
   * Fetches latest block number
   */
  async latestBlockNumber() {
    let latestBlock = await this.ctx.redis.get('latestBlockNumber');

    if (!latestBlock) {
      const result = await this.ctx.db('block').max('number');
      latestBlock = result[0].max ?? '0';
      await this.ctx.redis.set('latestBlockNumber', latestBlock ?? '0');
    }
    return Number(latestBlock);
  }

  /**
   * Saves blocks into Database and Cache with expiry
   */
  async save(block: FullBlock) {
    const latestBlock = await this.latestBlockNumber();

    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      transactions, inherents, events, logs, ...dbBlock
    } = block;

    await saveCached(block, this.ctx, {
      tableName: 'block',
      idField: 'hash',
      keyOf: Block.keyOf,
      ttlSeconds: block.significant ? this.ctx.ttlMax : this.ctx.ttlMin,
      dbData: dbBlock,
    });

    if (block.number > latestBlock) {
      await this.ctx.redis.set('latestBlockNumber', block.number.toString());
    }
    await this.ctx.redis.set(
      Block.keyOf(block.number),
      JSON.stringify(block),
      'EX',
      block.significant ? this.ctx.ttlMax : this.ctx.ttlMin,
    );
    if (block.number >= latestBlock) {
      await this.ctx.redis.publish('blockUpdated', JSON.stringify(block));
    }
  }

  /**
   * Retrieves block from Cache, if not found in Cache retrieves from Database
   */
  async get(numberOrHash: string) {
    try {
      let number: string | null = null;
      let hash: string | null = null;
      if (NUMBER_PATTERN.test(String(numberOrHash))) {
        number = numberOrHash;
      } else if (HASH_PATTERN.test(String(numberOrHash))) {
        hash = numberOrHash;
      } else {
        debug('Invalid block number %s ;', numberOrHash);
        return null;
      }

      let block: FullBlock;
      const cachedBlock = await this.ctx.redis.get(Block.keyOf(numberOrHash));
      if (cachedBlock) {
        block = JSON.parse(cachedBlock);
      } else {
        const query = this.ctx.db('block');
        if (number !== null) {
          query.where('number', number);
        } else {
          query.where('hash', hash);
        }
        const blocks = await query;
        block = blocks && blocks.length > 0 ? blocks[0] : null;

        if (block) {
          const [transactions, inherents, events, logs] = await Promise.all([
            this.ctx.db('transaction').select(this.ctx.db.raw('array_agg(hash) as transactions')).where('blockNumber', block.number),
            this.ctx.db('inherent').select(this.ctx.db.raw('array_agg(id) as inherents')).where('blockNumber', block.number),
            this.ctx.db('event').select(this.ctx.db.raw('array_agg(id) as events')).where('blockNumber', block.number),
            this.ctx.db('log').select(this.ctx.db.raw('array_agg(id) as logs')).where('blockNumber', block.number),
          ]);

          block.transactions = transactions[0].transactions ? transactions[0].transactions : [];
          block.inherents = inherents[0].inherents ? inherents[0].inherents : [];
          block.events = events[0].events ? events[0].events : [];
          block.logs = logs[0].logs ? logs[0].logs : [];

          await this.ctx.redis.set(
            Block.keyOf(block.number),
            JSON.stringify(block),
            'EX',
            block.significant ? this.ctx.ttlMax : this.ctx.ttlMin,
          );
          await this.ctx.redis.set(
            Block.keyOf(block.hash),
            JSON.stringify(block),
            'EX',
            block.significant ? this.ctx.ttlMax : this.ctx.ttlMin,
          );
        }
      }
      return block;
    } catch (e) {
      debug('Get block error : %o ;', e);
      return null;
    }
  }

  /**
   * Retrieves n blocks from Cache, if not found in Cache retrieves from Database
   */
  async getList(eventids: string[]) {
    return getListCached<BlockRow>(eventids, {
      ctx: this.ctx,
      keyOf: Block.keyOf,
      getOne: (id) => this.get(id),
    });
  }

  /**
   * Truncates table and returns deleted rows count
   */
  async truncate() {
    return this.ctx.db('block').del();
  }
}
