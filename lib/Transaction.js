const {promisify} = require("util"),
      _           = require("lodash");

module.exports = class Transaction {
    constructor(db, cache, ttl) {
        this.db        = db;
        this.cache     = cache;
        this.ttl       = ttl;
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
        await this.cacheSet(transaction.hash, JSON.stringify(transaction), 'EX', this.ttl);
    }

    /**
     * Retrieves transaction from Cache, if not found in Cache then retrieves from Database
     * @param hash
     * @return {Promise<*>}
     */
    async get(hash) {
        let transaction = await this.cacheGet(hash);
        console.log(transaction);
        if(transaction) {
            transaction = JSON.parse(transaction);
        } else {
            let resultSet = await this.db("transaction").where("hash", hash);
            transaction   = resultSet && resultSet.length > 0 ? resultSet[0] : null;
            if(transaction){
                transaction["events"] = _.map(await this.db("event").select("id").where("extrinsicid", transaction.id), function(event) {
                    return event.id;
                });
                await this.cacheSet(transaction.hash, JSON.stringify(transaction), 'EX', this.ttl);
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
        let keys   = _.map(hashes, function(hash) {
            return `${hash}`
        });
        let transactions = await this.cacheMget(keys);
        _.remove(transactions, function(transaction) {
            return transaction === null;
        });
        if(transactions.length === hashes.length) {
            transactions = _.map(transactions, function(transaction) {
                return JSON.parse(transaction)
            });
        } else {
           transactions = await this.db("transaction").whereIn("hash", hashes);
            _.map(transactions, async(transaction) =>{
                await this.cacheSet(transaction.hash, JSON.stringify(transaction), 'EX', this.ttl);
            });
        }
        return transactions;
    }
}