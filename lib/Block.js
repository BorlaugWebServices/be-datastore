const {promisify} = require("util"),
      _           = require("lodash");

module.exports = class Block {
    constructor(db, cache, ttl) {
        this.db        = db;
        this.cache     = cache;
        this.ttl       = ttl;
        this.cacheSet  = promisify(this.cache.set).bind(this.cache);
        this.cacheGet  = promisify(this.cache.get).bind(this.cache);
        this.cacheMget = promisify(this.cache.mget).bind(this.cache);
    }

    /**
     * Saves blocks into Database and Cache with expiry
     * @param block
     * @return {Promise<void>}
     */
    async save(block) {
        let dbBlock = {...block};
        delete dbBlock.transactions;
        delete dbBlock.inherents;
        delete dbBlock.events;
        delete dbBlock.logs;
        await this.db("block").insert(dbBlock);
        await this.cacheSet(`block:${block.number}`, JSON.stringify(block), 'EX', this.ttl);
    }

    /**
     * Retrieves block from Cache, if not found in Cache retrieves from Database
     * @param number
     * @return {Promise<*>}
     */
    async get(number) {
        let block = await this.cacheGet(`block:${number}`);
        if(block) {
            block = JSON.parse(block);
        } else {
            let [blocks, transactions, inherents, events, logs] = await Promise.all([
                this.db("block").where("number", number),
                this.db("transaction").select(this.db.raw("array_agg(hash) as transactions")).where("blockNumber", number),
                this.db("inherent").select(this.db.raw("array_agg(id) as inherents")).where("blockNumber", number),
                this.db("event").select(this.db.raw("array_agg(id) as events")).where("blockNumber", number),
                this.db("log").select(this.db.raw("array_agg(id) as logs")).where("blockNumber", number)
            ]);
            block                                               = blocks && blocks.length > 0 ? blocks[0] : null;
            if(block) {
                block["transactions"] = transactions[0].transactions ? transactions[0].transactions : [];
                block["inherents"]    = inherents[0].inherents ? inherents[0].inherents : [];
                block["events"]       = events[0].events ? events[0].events : [];
                block["logs"]         = logs[0].logs ? logs[0].logs : [];
            }
        }
        return block;
    }

    /**
     * Retrives n blocks from Cache, if not found in Cache retrieves from Database; n is length of numbers
     * @param numbers
     * @return {Promise<void>}
     */
    async getList(numbers) {
        let keys   = _.map(numbers, function(number) {
            return `block:${number}`
        });
        let blocks = this.cacheMget(keys);
        if(blocks.length === keys.length) {
            blocks = _.map(blocks, function(block) {
                return JSON.parse(block);
            });
        } else {
            let transactions, inherents, events, logs;
            [blocks, transactions, inherents, events, logs] = await Promise.all([
                this.db("block").whereIn("number", numbers),
                this.db("transaction").select(this.db.raw("blockNumber, array_agg(hash) as transactions")).whereIn("blockNumber", numbers),
                this.db("inherent").select(this.db.raw("blockNumber, array_agg(id) as inherents")).whereIn("blockNumber", numbers),
                this.db("event").select(this.db.raw("blockNumber, array_agg(id) as events")).whereIn("blockNumber", numbers),
                this.db("log").select(this.db.raw("blockNumber, array_agg(id) as logs")).whereIn("blockNumber", numbers)
            ]);
            let transactions_map =  _.reduce(transactions , function(obj,param) {
                obj[param.blockNumber] = param.hash;
                return obj;
            }, {});
            let inherents_map =  _.reduce(inherents , function(obj,param) {
                obj[param.blockNumber] = param.id;
                return obj;
            }, {});
            let events_map =  _.reduce(events , function(obj,param) {
                obj[param.blockNumber] = param.id;
                return obj;
            }, {});
            let logs_map =  _.reduce(logs , function(obj,param) {
                obj[param.blockNumber] = param.id;
                return obj;
            }, {});
            blocks = _.map(blocks, function(block) {
                block["transactions"] = transactions_map[block.number]
                block["inherents"]    = inherents_map[block.number]
                block["events"]       = events_map[block.number]
                block["logs"]         = logs_map[block.number]
            })
        }
        return blocks;
    }
};