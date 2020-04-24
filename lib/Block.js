const {promisify} = require("util");

module.exports = class Block {
    constructor(db, cache, ttl) {
        this.db       = db;
        this.cache    = cache;
        this.ttl      = ttl;
        this.cacheSet = promisify(this.cache.set).bind(this.cache);
        this.cacheGet = promisify(this.cache.get).bind(this.cache);
    }

    async save(block) {
        let dbBlock = { ...block };
        delete dbBlock.transactions;
        delete dbBlock.inherents;
        delete dbBlock.events;
        delete dbBlock.logs;
        await this.db("block").insert(dbBlock);
        await this.cacheSet(`block:${block.number}`, JSON.stringify(block), 'EX', this.ttl);
    }

    async get(number) {
        let block = await this.cacheGet(number);
        if(block) {
            block = JSON.parse(block);
        } else {
            let resultSet = await this.db("block").where("number", number);
            block         = resultSet && resultSet.length > 0 ? resultSet[0] : null;
        }
        return block;
    }
};