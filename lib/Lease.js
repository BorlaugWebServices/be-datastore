const debug       = require("debug")("be-datastore:Lease");
const {promisify} = require("util"),
      _           = require("lodash");

module.exports = class Lease {
    constructor(db, cache, ttl) {
        this.db          = db;
        this.cache       = cache;
        this.ttl         = ttl;
        this.cacheSet    = promisify(this.cache.set).bind(this.cache);
        this.cacheGet    = promisify(this.cache.get).bind(this.cache);
        this.cacheMget   = promisify(this.cache.mget).bind(this.cache);
        this.cacheLpush  = promisify(this.cache.lpush).bind(this.cache);
        this.cacheExists = promisify(this.cache.exists).bind(this.cache);
        this.cacheLrange = promisify(this.cache.lrange).bind(this.cache);
    }

    /**
     * Saves inherent in Database and Cache with expiry
     * @param lease
     * @return {Promise<void>}
     */
    async save(lease) {
        let dbLease = {...lease};
        lease       = {
            allocations: JSON.parse(lease.allocations),
            lessee: JSON.parse(lease.lessee),
            lessor: JSON.parse(lease.lessor)
        }
        await this.db("lease").insert(dbLease);
        await this.cacheSet(`lease:${lease.id}`, JSON.stringify(lease), 'EX', this.ttl);
    }

    /**
     * Saves activities (transactions) associated with a lease
     * @param activity
     * @return {Promise<void>}
     */
    async saveActivity(activity) {
        await this.db("lease_activity").insert(activity);
    }

    /**
     * Retrieves inherent from Cache, if not found in Cache retrieves from Database
     * @param leaseid
     * @return {Promise<*>}
     */
    async get(leaseid) {
        let lease = await this.cacheGet(`lease:${leaseid}`);
        if(lease) {
            lease = JSON.parse(lease);
        } else {
            let resultSet = await this.db("lease").where("id", leaseid);
            lease         = resultSet && resultSet.length > 0 ? resultSet[0] : null;
            await this.cacheSet(`lease:${lease.id}`, JSON.stringify(lease), 'EX', this.ttl);
        }
        return lease;
    }

    /**
     * Retrieves associated activities (transactions) with lease
     * @param leaseid
     * @return {Promise<*>}
     */
    async getActivities(leaseid) {
        let activities = await this.db("lease_activity").where("lease_id", leaseid).select("tx_hash");
        activities = _.map(activities, 'tx_hash');
        return activities;
    }

    /**
     * Truncates table and returns deleted rows count
     * @return {Promise<*|string|undefined|Knex.QueryBuilder<any, void>>}
     */
    async truncate() {
        return this.db("lease").del();
    }
};