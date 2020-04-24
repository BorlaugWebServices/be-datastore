const {promisify} = require("util");

module.exports = class Event {
    constructor(db, cache, ttl) {
        this.db       = db;
        this.cache    = cache;
        this.ttl      = ttl;
        this.cacheSet = promisify(this.cache.set).bind(this.cache);
        this.cacheGet = promisify(this.cache.get).bind(this.cache);
    }

    async save(event) {
        await this.db("event").insert(event);
        await this.cacheSet(`evn:${event.id}`, JSON.stringify(event), 'EX', this.ttl);
    }

    async get(eventid) {
        let event = await this.cacheGet(eventid);
        if(event) {
            event = JSON.parse(event);
        } else {
            let resultSet = await this.db("event").where("id", eventid);
            event         = resultSet && resultSet.length > 0 ? resultSet[0] : null;
        }
        return event;
    }
};