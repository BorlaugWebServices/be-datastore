const debug       = require("debug")("be-datastore:Group");
const {promisify} = require("util"),
    _           = require("lodash");

const NUMBER_PATTERN = RegExp('^[0-9]*$');

module.exports = class Group {
    constructor(db, cache, ttlMin, ttlMax) {
        this.db          = db;
        this.cache       = cache;
        this.ttlMin      = ttlMin;
        this.ttlMax      = ttlMax;
        this.cacheSet    = promisify(this.cache.set).bind(this.cache);
        this.cacheGet    = promisify(this.cache.get).bind(this.cache);
        this.cacheMget   = promisify(this.cache.mget).bind(this.cache);
        this.cacheLpush  = promisify(this.cache.lpush).bind(this.cache);
        this.cacheExists = promisify(this.cache.exists).bind(this.cache);
        this.cacheLrange = promisify(this.cache.lrange).bind(this.cache);
    }

    /**
     * Saves group in Database and Cache with expiry
     * @param group
     * @return {Promise<void>}
     */
    async save(group) {
        debug(group)
        let id = group.id;
        await this.db("group").insert(group);
        await this.cacheSet(`group:${Number(id)}`, JSON.stringify(group), 'EX', this.ttlMax);
    }

    /**
     * Saves activities (transactions) associated with an group
     * @param activity
     * @return {Promise<void>}
     */
    async saveActivity(activity) {
        await this.db("group_activity").insert(activity);
    }

    /**
     * Retrieves lease from Cache, if not found in Cache retrieves from Database
     * @param groupid
     * @return {Promise<*>}
     */
    async get(groupid) {
        if(!NUMBER_PATTERN.test(groupid)) {
            debug('Invalid group id %s ;', groupid);
            return null;
        }

        let group = await this.cacheGet(`group:${groupid}`);
        if(group) {
            group = JSON.parse(group);
        } else {
            let resultSet = await this.db("group").where("id", groupid);
            group         = resultSet && resultSet.length > 0 ? resultSet[0] : null;
            if(group) {
                await this.cacheSet(`group:${group.id}`, JSON.stringify(group), 'EX', this.ttlMax);
            }
        }
        return group;
    }

    /**
     * Retrieves associated activities (transactions) with group
     * @param groupid
     * @return {Promise<*>}
     */
    async getActivities(groupid) {
        let activities = await this.db("group_activity").where("group_id", groupid).select("tx_hash");
        activities     = _.map(activities, 'tx_hash');
        return activities;
    }

    /**
     * Truncates table and returns deleted rows count
     * @return {Promise<*|string|undefined|Knex.QueryBuilder<any, void>>}
     */
    async truncate() {
        return Promise.all([
            this.db("group").del(),
            this.db("group_activity").del()
        ]);
    }
};
