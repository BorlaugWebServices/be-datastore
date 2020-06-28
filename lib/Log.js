const debug       = require("debug")("be-datastore:Log");
const {promisify} = require("util"),
      _           = require("lodash");

const ID_PATTERN     = RegExp('^[0-9]*-[0-9]*$');

module.exports = class Log {
    constructor(db, cache, ttl) {
        this.db        = db;
        this.cache     = cache;
        this.ttl       = ttl;
        this.cacheSet  = promisify(this.cache.set).bind(this.cache);
        this.cacheGet  = promisify(this.cache.get).bind(this.cache);
        this.cacheMget = promisify(this.cache.mget).bind(this.cache);
    }

    /**
     * Saves log in Database and Cache with expiry
     * @param log
     * @return {Promise<void>}
     */
    async save(log) {
        await this.db("log").insert(log);
        await this.cacheSet(`log:${log.id}`, JSON.stringify(log), 'EX', this.ttl);
    }

    /**
     * Retrieves log from Cache, if not found in Cache then retrieves from Database
     * @param logid
     * @return {Promise<*>}
     */
    async get(logid) {
        if(!ID_PATTERN.test(logid)){
            debug('Invalid log id %s ;', logid);
            return null;
        }

        let log = await this.cacheGet(`log:${logid}`);
        if(log) {
            log = JSON.parse(log);
        } else {
            let resultSet = await this.db("log").where("id", logid);
            log           = resultSet && resultSet.length > 0 ? resultSet[0] : null;
            if(log){
                await this.cacheSet(`log:${log.id}`, JSON.stringify(log), 'EX', this.ttl);
            }
        }
        return log;
    }

    /**
     * Retrieves n logs from Cache, if n logs are not found in Cache then retrieves from Database; n is length of logids
     * @param logids
     * @return {Promise<*>}
     */
    async getList(logids) {
        let keys = _.map(logids, function(logid) {
            return `log:${logid}`
        });
        let logs = await this.cacheMget(keys);
        _.remove(logs, function(log) {
            return log === null;
        });
        if(logs.length === keys.length) {
            logs = _.map(logs, function(log) {
                return JSON.parse(log)
            });
        } else {
            logs = await this.db("log").whereIn("id", logids);
            _.map(logs, async(log) =>{
                await this.cacheSet(`log:${log.id}`, JSON.stringify(log), 'EX', this.ttl);
            });
        }
        return logs;
    }

    /**
     * Truncates table and returns deleted rows count
     * @return {Promise<*|string|undefined|Knex.QueryBuilder<any, void>>}
     */
    async truncate(){
        return this.db("log").del();
    }
};