const {promisify} = require("util"),
      _           = require("lodash");

module.exports = class Lease {
    constructor(db, cache, ttl) {
        this.db        = db;
        this.cache     = cache;
        this.ttl       = ttl;
        this.cacheSet  = promisify(this.cache.set).bind(this.cache);
        this.cacheGet  = promisify(this.cache.get).bind(this.cache);
        this.cacheMget = promisify(this.cache.mget).bind(this.cache);
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
     * Truncates table and returns deleted rows count
     * @return {Promise<*|string|undefined|Knex.QueryBuilder<any, void>>}
     */
    async truncate() {
        return this.db("lease").del();
    }
};