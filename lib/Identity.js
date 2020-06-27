const debug       = require("debug")("be-datastore:Identity");
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
     * Saves identities in Database and Cache with expiry
     * @param identity
     * @return {Promise<void>}
     */
    async save(identity) {
        let dbIdentity = {...identity};
        debug('Insert into identity values %o ;', dbIdentity);
        await this.db("identity").insert(dbIdentity);
        await this.cacheSet(`did:bws:${identity.did}`, JSON.stringify(identity), 'EX', this.ttl);
    }

    /**
     * Saves activities (transactions) associated with a lease
     * @param activity
     * @return {Promise<void>}
     */
    async saveActivity(activity) {
        await this.db("identity_activity").insert(activity);
    }

    /**
     * Retrieves identity from Cache, if not found in Cache retrieves from Database
     * @param did
     * @return {Promise<*>}
     */
    async get(did) {
        let identity = await this.cacheGet(`did:bws:${did}`);
        if(identity) {
            identity = JSON.parse(identity);
        } else {
            let resultSet = await this.db("identity").where("did", did);
            identity      = resultSet && resultSet.length > 0 ? resultSet[0] : null;
            await this.cacheSet(`did:bws:${did}`, JSON.stringify(identity), 'EX', this.ttl);
        }
        return identity;
    }

    /**
     * Retrieves associated activities (transactions) with identity
     * @param did
     * @return {Promise<*>}
     */
    async getActivities(did) {
        let activities = await this.db("identity_activity").where("did", did).select("tx_hash");
        activities     = _.map(activities, 'tx_hash');
        return activities;
    }

    /**
     * Truncates table and returns deleted rows count
     * @return {Promise<*|string|undefined|Knex.QueryBuilder<any, void>>}
     */
    async truncate() {
        return Promise.all([
            this.db("identity").del(),
            this.db("identity_activity").del()
        ]);
    }
};