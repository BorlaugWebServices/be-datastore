import knex, { Knex } from 'knex';
import { createClient } from 'redis';
import { waitUntil } from 'async-wait-until';
import { promisify } from 'util';
import Debug from 'debug';

import Migration from './Migration';
import Block from './Block';
import Transaction from './Transaction';
import Inherent from './Inherent';
import Event from './Event';
import Log from './Log';
import Lease from './Lease';
import Identity from './Identity';
import Audit from './Audit';
import Provenance from './Provenance';
import Proposal from './Proposal';
import Group from './Group';
import { StoreContext } from './types';
import { wrapRedis } from './utils';

const debug = Debug('be-datastore:DataStore');

export default class DataStore {
  db: Knex;

  cache: any;

  migration: Migration;

  block: Block;

  transaction: Transaction;

  inherent: Inherent;

  event: Event;

  log: Log;

  lease: Lease;

  identity: Identity;

  audit: Audit;

  provenance: Provenance;

  proposal: Proposal;

  group: Group;

  private cacheStatus = 'UNKNOWN';

  cleanup: () => Promise<number>;

  constructor(databaseType: string, databaseUrl: string, redisHost: string, redisPort: number, ttlMin: number, ttlMax: number) {
    // initialize pg connection
    this.db = knex({ client: databaseType, connection: databaseUrl, debug: false });

    // Initialize redis cluster connection
    this.cache = createClient({
      socket: {
        host: redisHost,
        port: redisPort,
      },
    });

    this.cache.on('error', (error: any) => {
      debug('Cache Error', error);
      this.cacheStatus = 'ERROR';
    });

    this.cache.on('ready', (data: any) => {
      debug('Cache Ready');
      this.cacheStatus = 'SUCCESS';
    });

    const isV4plus = (typeof this.cache.connect === 'function');

    if (isV4plus) {
      debug('Detected Redis v4+, calling .connect()...');
      this.cache.connect().catch((err: any) => {
        debug('Connection Error:', err);
        this.cacheStatus = 'ERROR';
      });
    }

    const storeContext: StoreContext = {
      db: this.db,
      ttlMin,
      ttlMax,
      isV4plus,
      redis: {
        get: wrapRedis(this.cache, 'get', isV4plus),
        set: wrapRedis(this.cache, 'set', isV4plus),
        mget: wrapRedis(this.cache, isV4plus ? 'mGet' : 'mget', isV4plus),
        publish: wrapRedis(this.cache, 'publish', isV4plus),
      },
    };

    this.migration = new Migration(storeContext.db); // Migrations usually only need DB
    this.block = new Block(storeContext);
    this.transaction = new Transaction(storeContext);
    this.inherent = new Inherent(storeContext);
    this.event = new Event(storeContext);
    this.log = new Log(storeContext);
    this.lease = new Lease(storeContext);
    this.identity = new Identity(storeContext);
    this.audit = new Audit(storeContext);
    this.provenance = new Provenance(storeContext);
    this.proposal = new Proposal(storeContext);
    this.group = new Group(storeContext);

    this.cleanup = async () => {
      const keys = isV4plus ? await this.cache.keys('*') : await promisify(this.cache.keys).bind(this.cache)('*');
      const { length } = keys;
      debug('Found %d keys', length);

      if (isV4plus) {
        await this.cache.flushDb();
        debug('Flushed DB');
      } else {
        await this.cache.flushdb((err: any, succeeded: any) => {
          debug(succeeded); // will be true if successfull
        });
      }
      debug('%d keys deleted', length);

      const [n1, n2, n3, n4, n5, n6, n7, n8, n9, n10] = await Promise.all([
        await this.block.truncate(),
        await this.transaction.truncate(),
        await this.inherent.truncate(),
        await this.event.truncate(),
        await this.log.truncate(),
        await this.lease.truncate(),
        await this.identity.truncate(),
        await this.audit.truncate(),
        await this.provenance.truncate(),
        await this.proposal.truncate(),
        await this.group.truncate(),
      ]);
      debug(`${n1},${n2},${n3},${n4},${n5},${n6},${n7},${n8},${n9},${n10} rows deleted`);

      return length;
    };
  }

  async connect() {
    try {
      // test pg connection
      await this.db.raw('SELECT 1');
      debug('DB connection success');

      await waitUntil(() => this.cacheStatus !== 'UNKNOWN', 6000);
      return this;
    } catch (error) {
      debug('DB connection failure');
      throw error;
    }
  }
}
