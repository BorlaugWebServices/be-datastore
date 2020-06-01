const debug       = require("debug")("be-datastore:Event");
const {promisify} = require("util"),
      _           = require("lodash");

module.exports = class Event {
    constructor(db, cache, ttl) {
        this.db        = db;
        this.cache     = cache;
        this.ttl       = ttl;
        this.cacheSet  = promisify(this.cache.set).bind(this.cache);
        this.cacheGet  = promisify(this.cache.get).bind(this.cache);
        this.cacheMget = promisify(this.cache.mget).bind(this.cache);
    }

    /**
     * Saves event in Database and Cache with expiry
     * @param event
     * @return {Promise<void>}
     */
    async save(event) {
        await this.db("event").insert(event);
        await this.cacheSet(`evn:${event.id}`, JSON.stringify(event), 'EX', this.ttl);
    }

    /**
     * Retrieves event from Cache, if not found in Cache retrieves from Database
     * @param eventid
     * @return {Promise<*>}
     */
    async get(eventid) {
        let event = await this.cacheGet(`evn:${eventid}`);
        if(event) {
            event = JSON.parse(event);
        } else {
            let resultSet = await this.db("event").where("id", eventid);
            event         = resultSet && resultSet.length > 0 ? resultSet[0] : null;
            if(event) {
                await this.cacheSet(`evn:${event.id}`, JSON.stringify(event), 'EX', this.ttl);
            }
        }
        return event;
    }

    /**
     * Retrieves n logs from Cache, if n logs are not found in Cache then retrieves from Database; n is length of eventids
     * @param eventids
     * @return {Promise<*>}
     */
    async getList(eventids) {
        let keys   = _.map(eventids, function(eventid) {
            return `evn:${eventid}`
        });
        let events = await this.cacheMget(keys);
        _.remove(events, function(event) {
            return event === null;
        });
        if(events.length === keys.length) {
            events = _.map(events, function(event) {
                return JSON.parse(event)
            });
        } else {
            events = await this.db("event").whereIn("id", eventids);
            _.map(events, async (event) => {
                await this.cacheSet(`evn:${event.id}`, JSON.stringify(event), 'EX', this.ttl);
            });
        }
        return events;
    }

    /**
     * Truncates table and returns deleted rows count
     * @return {Promise<*|string|undefined|Knex.QueryBuilder<any, void>>}
     */
    async truncate() {
        return this.db("event").del();
    }
};