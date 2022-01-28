const debug       = require("debug")("be-datastore:Event");
const {promisify} = require("util"),
      _           = require("lodash");

const ID_PATTERN = RegExp('^[0-9]*-[0-9]*$');

module.exports = class Event {
    constructor(db, cache, ttlMin, ttlMax) {
        this.db        = db;
        this.cache     = cache;
        this.ttlMin    = ttlMin;
        this.ttlMax    = ttlMax;
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
        //debug('event significance ',event.significant);
        let resultSet = await this.db("event").where("id", event.id);
        if(resultSet && resultSet.length === 0) {
            await this.db("event").insert(event);
        }
        let cache_event = await this.cacheGet(`evn:${event.id}`);
        if(!cache_event) {
            await this.cacheSet(`evn:${event.id}`, JSON.stringify(event), 'EX', event.significant ? this.ttlMax : this.ttlMin);
        }
    }

    /**
     * Retrieves event from Cache, if not found in Cache retrieves from Database
     * @param eventid
     * @return {Promise<*>}
     */
    async get(eventid) {
        if(!ID_PATTERN.test(eventid)) {
            debug('Invalid event id %s ;', eventid);
            return null;
        }

        let event = await this.cacheGet(`evn:${eventid}`);
        if(event) {
            event = JSON.parse(event);
        } else {
            let resultSet = await this.db("event").where("id", eventid);
            event         = resultSet && resultSet.length > 0 ? resultSet[0] : null;
            if(event) {
                await this.cacheSet(`evn:${event.id}`, JSON.stringify(event), 'EX', event.significant?this.ttlMax:this.ttlMin);
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
        let events = keys.length > 0 ? await this.cacheMget(keys) : [];
        _.remove(events, function(event) {
            return event === null;
        });
        if(events.length === keys.length) {
            events = _.map(events, function(event) {
                return JSON.parse(event)
            });
            debug(events);
        } else {
            events = await this.db("event").whereIn("id", eventids);
            debug(events);
            _.map(events, async (event) => {
                await this.cacheSet(`evn:${event.id}`, JSON.stringify(event), 'EX', this.ttlMin);
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
