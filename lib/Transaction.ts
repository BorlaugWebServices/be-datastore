import Debug from 'debug';
import {FullTransaction, StoreContext} from './types';
import {getCached, getListCached, saveCached} from './utils';
import {HASH_PATTERN, PUBLIC_KEY_PATTERN} from './constants';
import {TransactionRow} from './dbTypes';

const debug = Debug('be-datastore:Transaction');

export default class Transaction {
  private readonly ctx: StoreContext;

  constructor(ctx: StoreContext) {
    this.ctx = ctx;
  }

  private static keyOf(id: string | number) {
    return `${id}`;
  }

  static async fetchOne(ctx: StoreContext, id: string) {
    const resultSet = await ctx.db('transaction').where('hash', id);
    const transaction = resultSet && resultSet.length > 0 ? resultSet[0] : null;

    if (transaction) {
      const events = await ctx.db('event').select('id').where('extrinsicid', transaction.id);
      transaction.events = events.map((event: any) => event.id);
    }
    return transaction;
  }

  /**
   * Fetches latest block number
   * @return {Promise<*>}
   */
  async latestTxBlockNumber() {
    let latestTxBlock: any = await this.ctx.redis.get('latestTxBlockNumber');

    if (!latestTxBlock) {
      const result = await this.ctx.db('transaction').max('blockNumber');
      if (result[0] && result[0].max) {
        latestTxBlock = Number(result[0].max);
        debug('latestTxBlock', latestTxBlock);
        await this.ctx.redis.set('latestTxBlockNumber', latestTxBlock.toString());
      }
    } else {
      latestTxBlock = Number(latestTxBlock);
    }

    return latestTxBlock;
  }

  /**
   * Saves transaction in Database and Cache with expiry
   */
  async save(transaction: FullTransaction) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {events, ...dbTransaction} = transaction;
    let latestTxBlock = await this.latestTxBlockNumber();
    latestTxBlock = latestTxBlock ? Number(latestTxBlock) : 0;
    await saveCached(transaction, this.ctx, {
      tableName: 'transaction',
      idField: 'hash',
      keyOf: Transaction.keyOf,
      ttlSeconds: this.ctx.ttlMax,
      dbData: dbTransaction,
    });

    if (Number(dbTransaction.blockNumber) >= latestTxBlock) {
      await this.ctx.redis.set('latestTxBlockNumber', dbTransaction.blockNumber.toString());
      await this.ctx.redis.publish('transactionUpdated', JSON.stringify(transaction));
      // debug('blockUpdated event triggered', Number(block.number));
    }
  }

  /**
   * Retrieves transaction from Cache, if not found in Cache then retrieves from Database
   */
  async get(hash: string) {
    return getCached(hash, this.ctx, {
      isValid: (id) => HASH_PATTERN.test(id),
      keyOf: Transaction.keyOf,
      fetchOne: async (id) => Transaction.fetchOne(this.ctx, id),
      ttlSeconds: this.ctx.ttlMax,
    });
  }

  /**
   * Retrieves n transactions from Cache, if n transactions are not found in Cache then retrieves from Database; n is length of transactions

   */
  async getList(hashes: string[]) {
    return getListCached<TransactionRow>(hashes, {
      ctx: this.ctx,
      keyOf: Transaction.keyOf,
      getOne: (id) => this.get(id),
    });
  }

  /**
   * Get Transactions paginated
   */
  async getPage(page: number, perPage: number) {
    const limit = perPage || 10;
    const offset = page * (perPage || 1);

    let total: any = await this.ctx.db('transaction').count();
    total = total[0].count;

    const slice = await this.ctx.db('transaction')
      .orderBy('blockNumber', 'desc')
      .offset(offset)
      .limit(limit);

    return {total, slice};
  }

  /**
   * Get all transactions of an account
   */
  async getTxnByAddress(page: number, perPage: number, address: string) {
    if (!PUBLIC_KEY_PATTERN.test(address)) {
      debug('Invalid account address %s ;', address);
      return null;
    }

    const limit = perPage || 10;
    const offset = page * (perPage || 1);

    let total: any = await this.ctx.db('transaction').where('signer', address).count();
    total = total[0].count;

    const slice = await this.ctx.db('transaction')
      .where('signer', address)
      .orderBy('blockNumber', 'desc')
      .offset(offset)
      .limit(limit);

    return {total, slice};
  }

  /**
   * Get all signers
   */
  async getSigners(page: number, perPage: number) {
    const limit = perPage || 10;
    const offset = page * (perPage || 1);

    let total: any = await this.ctx.db('transaction')
      .select('signer')
      .distinct()
      .count('*')
      .groupBy('signer');

    total = total.length;

    const slice = await this.ctx.db('transaction')
      .select('signer')
      .distinct()
      .count('*')
      .groupBy('signer')
      .offset(offset)
      .limit(limit);

    return {total, slice};
  }

  /**
   * Truncates table and returns deleted rows count
   */
  async truncate() {
    return this.ctx.db('transaction').del();
  }
}
