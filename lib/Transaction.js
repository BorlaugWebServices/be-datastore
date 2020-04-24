const {promisify} = require("util");

module.exports = class Transaction {
    constructor(db, cache, ttl) {
        this.db       = db;
        this.cache    = cache;
        this.ttl      = ttl;
        this.cacheSet = promisify(this.cache.set).bind(this.cache);
        this.cacheGet = promisify(this.cache.get).bind(this.cache);
    }

    async save(transaction) {
        let dbTransaction = {...transaction};
        delete dbTransaction.events;
        await this.db("transaction").insert(dbTransaction);
        await this.cacheSet(transaction.hash, JSON.stringify(transaction), 'EX', this.ttl);
    }

    async get(hash) {
        let transaction = await this.cacheGet(hash);
        if(transaction) {
            transaction = JSON.parse(transaction);
        } else {
            let resultSet = await this.db("transaction").where("hash", hash);
            transaction   = resultSet && resultSet.length > 0 ? resultSet[0] : null;
        }
        return transaction;

    }
}