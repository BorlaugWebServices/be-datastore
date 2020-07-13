const debug       = require("debug")("be-datastore:Transaction");
const {promisify} = require("util"),
      _           = require("lodash");

const HASH_PATTERN = RegExp('^0x([A-Fa-f0-9]{64})$');

module.exports = class Transaction {
    constructor(db, cache, ttlMin, ttlMax) {
        this.db        = db;
        this.cache     = cache;
        this.ttlMin    = ttlMin;
        this.ttlMax    = ttlMax;
        this.cacheSet  = promisify(this.cache.set).bind(this.cache);
        this.cacheGet  = promisify(this.cache.get).bind(this.cache);
        this.cacheMget = promisify(this.cache.mget).bind(this.cache);
    }

    /**
     * Saves transaction in Database and Cache with expiry
     * @param transaction
     * @return {Promise<void>}
     */
    async save(transaction) {
        let dbTransaction = {...transaction};
        delete dbTransaction.events;
        await this.db("transaction").insert(dbTransaction);
        await this.cacheSet(transaction.hash, JSON.stringify(transaction), 'EX', this.ttlMax);
    }

    /**
     * Retrieves transaction from Cache, if not found in Cache then retrieves from Database
     * @param hash
     * @return {Promise<*>}
     */
    async get(hash) {
        if(!HASH_PATTERN.test(hash)) {
            debug('Invalid transaction hash %s ;', hash);
            return null;
        }

        let transaction = await this.cacheGet(hash);
        debug('transaction %O ;',transaction);
        if(transaction) {
            transaction = JSON.parse(transaction);
            debug('if transaction %O ;',transaction);
        } else {
            let resultSet = await this.db("transaction").where("hash", hash);
            transaction   = resultSet && resultSet.length > 0 ? resultSet[0] : null;
            debug('else transaction %O ;',transaction);
            if(transaction) {
                let events = await this.db("event").select("id").where("extrinsicid", transaction.id);
                debug('events %O ;',transaction);

                transaction["events"] = _.map(events, function(event) {
                    return event.id;
                });

                debug('transaction["events"] %O',transaction["events"]);
                await this.cacheSet(transaction.hash, JSON.stringify(transaction), 'EX', this.ttlMax);
            }
        }
        return transaction;
    }

    /**
     * Retrieves n transactions from Cache, if n transactions are not found in Cache then retrieves from Database; n is length of transactions
     * @param hashes
     * @return {Promise<*>}
     */
    async getList(hashes) {
        let keys         = _.map(hashes, function(hash) {
            return `${hash}`
        });
        let transactions = keys.length> 0 ?await this.cacheMget(keys): [];
        _.remove(transactions, function(transaction) {
            return transaction === null;
        });
        if(transactions.length === hashes.length) {
            transactions = _.map(transactions, function(transaction) {
                return JSON.parse(transaction)
            });
        } else {
            transactions = await this.db("transaction").whereIn("hash", hashes);
            _.map(transactions, async (transaction) => {
                await this.cacheSet(transaction.hash, JSON.stringify(transaction), 'EX', this.ttlMin);
            });
        }
        return transactions;
    }

    /**
     * Truncates table and returns deleted rows count
     * @return {Promise<*|string|undefined|Knex.QueryBuilder<any, void>>}
     */
    async truncate() {
        return this.db("transaction").del();
    }
}