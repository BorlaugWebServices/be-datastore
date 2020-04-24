const {promisify} = require("util");

module.exports = class Event {
    constructor(db, cache, ttl) {
        this.db       = db;
        this.cache    = cache;
        this.ttl      = ttl;
        this.cacheSet = promisify(this.cache.set).bind(this.cache);
        this.cacheGet = promisify(this.cache.get).bind(this.cache);
    }

    async save(inherent) {
        let dbInherent = {...inherent};
        delete dbInherent.events;
        await this.db("inherent").insert(dbInherent);
        await this.cacheSet(`inh:${inherent.id}`, JSON.stringify(inherent), 'EX', this.ttl);
    }

    async get(inherentd) {
        let inherent = await this.cacheGet(inherentd);
        if(inherent) {
            inherent = JSON.parse(inherent);
        } else {
            let resultSet = await this.db("inherent").where("id", inherentd);
            inherent      = resultSet && resultSet.length > 0 ? resultSet[0] : null;
        }
        return inherent;
    }
};