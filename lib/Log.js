const {promisify} = require("util");

module.exports = class Event {
    constructor(db, cache, ttl) {
        this.db       = db;
        this.cache    = cache;
        this.ttl      = ttl;
        this.cacheSet = promisify(this.cache.set).bind(this.cache);
        this.cacheGet = promisify(this.cache.get).bind(this.cache);
    }

    async save(log) {
        await this.db("log").insert(log);
        await this.cacheSet(`log:${log.id}`, JSON.stringify(log), 'EX', this.ttl);
    }

    async get(logid) {
        let log = await this.cacheGet(logid);
        if(log) {
            log = JSON.parse(log);
        } else {
            let resultSet = await this.db("log").where("id", logid);
            log         = resultSet && resultSet.length > 0 ? resultSet[0] : null;
        }
        return log;
    }
};