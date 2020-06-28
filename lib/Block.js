const debug       = require("debug")("be-datastore:Block");
const {promisify} = require("util"),
      _           = require("lodash");

const NUMBER_PATTERN = RegExp('^[0-9]*$');
const HASH_PATTERN   = RegExp('^0x([A-Fa-f0-9]{64})$');

module.exports = class Block {
    constructor(db, cache, ttl) {
        this.db           = db;
        this.cache        = cache;
        this.ttl          = ttl;
        this.cacheSet     = promisify(this.cache.set).bind(this.cache);
        this.cacheGet     = promisify(this.cache.get).bind(this.cache);
        this.cacheMget    = promisify(this.cache.mget).bind(this.cache);
        this.cachePublish = promisify(this.cache.publish).bind(this.cache);
    }

    /**
     * Fetches latest block number
     * @return {Promise<*>}
     */
    async latestBlockNumber() {
        let latestBlock = await this.cacheGet("latestBlockNumber");

        if(!latestBlock) {
            latestBlock = await this.db("block").max("number");
            if(latestBlock[0].max) {
                await this.cacheSet("latestBlockNumber", latestBlock[0].max.toString());
            }
        } else {
            latestBlock = Number(latestBlock);
        }

        return latestBlock;
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
        let latestBlock = await this.latestBlockNumber();
        await this.db("block").insert(dbBlock);
        if(block.number > latestBlock) {
            debug(typeof block.number);
            await this.cacheSet("latestBlockNumber", block.number.toString());
        }
        await this.cacheSet(`block:${block.number}`, JSON.stringify(block), 'EX', this.ttl);
        await this.cacheSet(`block:${block.hash}`, JSON.stringify(block), 'EX', this.ttl);
        if(block.number >= latestBlock) {
            await this.cachePublish('blockUpdated', JSON.stringify(block));
            debug('blockUpdated', block.number);
        }
    }

    /**
     * Retrieves block from Cache, if not found in Cache retrieves from Database
     * @param numberOrHash
     * @return {Promise<*>}
     */
    async get(numberOrHash) {
        let block = null;
        try {
            let number = null;
            let hash   = null;
            if(NUMBER_PATTERN.test(numberOrHash)) {
                number = numberOrHash;
            } else if(HASH_PATTERN.test(numberOrHash)) {
                hash = numberOrHash;
            } else {
                debug('Invalid block number %s ;', numberOrHash);
                return null;
            }
            //debug('Number : %d ; Hash : %s ;', number, hash);

            block = await this.cacheGet(`block:${number}`);
            if(block) {
                block = JSON.parse(block);
            } else {
                let blocks = await this.db("block").where("number", number).orWhere("hash", hash);
                block      = blocks && blocks.length > 0 ? blocks[0] : null;

                if(block) {
                    let [transactions, inherents, events, logs] = await Promise.all([
                        this.db("transaction").select(this.db.raw("array_agg(hash) as transactions")).where("blockNumber", block.number),
                        this.db("inherent").select(this.db.raw("array_agg(id) as inherents")).where("blockNumber", block.number),
                        this.db("event").select(this.db.raw("array_agg(id) as events")).where("blockNumber", block.number),
                        this.db("log").select(this.db.raw("array_agg(id) as logs")).where("blockNumber", block.number)
                    ]);

                    block["transactions"] = transactions[0].transactions ? transactions[0].transactions : [];
                    block["inherents"]    = inherents[0].inherents ? inherents[0].inherents : [];
                    block["events"]       = events[0].events ? events[0].events : [];
                    block["logs"]         = logs[0].logs ? logs[0].logs : [];
                    await this.cacheSet(`block:${block.number}`, JSON.stringify(block), 'EX', this.ttl);
                }
            }
            return block;
        } catch(e) {
            debug('Get block error : %o ;', e);
            return null;
        }
    }

    /**
     * Retrieves n blocks from Cache, if not found in Cache retrieves from Database; n is length of numbers
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
            let calls = [];
            numbers.forEach(number => {
                calls.push(this.get(number));
            });
            blocks = await Promise.all(calls);
            blocks = _.filter(blocks, function(block) {
                return block !== null
            });
            _.map(blocks, async (block) => {
                await this.cacheSet(`block:${block.number}`, JSON.stringify(block), 'EX', this.ttl);
            });
        }
        return blocks;
    }

    /**
     * Truncates table and returns deleted rows count
     * @return {Promise<*|string|undefined|Knex.QueryBuilder<any, void>>}
     */
    async truncate() {
        return await this.db("block").del();
    }
}