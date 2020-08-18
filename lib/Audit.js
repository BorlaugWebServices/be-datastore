const debug       = require("debug")("be-datastore:Lease");
const {promisify} = require("util"),
      _           = require("lodash");

const NUMBER_PATTERN = RegExp('^[0-9]*$');

module.exports = class Lease {
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
     * Saves audit in Database and Cache with expiry
     * @param audit
     * @return {Promise<void>}
     */
    async save(audit) {
        let id = audit.id;
        await this.db("audit").insert(audit);
        await this.cacheSet(`audit:${Number(id)}`, JSON.stringify(audit), 'EX', this.ttlMax);
    }

    /**
     * Saves activities (transactions) associated with an audit
     * @param activity
     * @return {Promise<void>}
     */
    async saveActivity(activity) {
        await this.db("audit_activity").insert(activity);
    }

    /**
     * Retrieves lease from Cache, if not found in Cache retrieves from Database
     * @param auditid
     * @return {Promise<*>}
     */
    async get(auditid) {
        if(!NUMBER_PATTERN.test(auditid)) {
            debug('Invalid audit id %s ;', auditid);
            return null;
        }

        let audit = await this.cacheGet(`audit:${auditid}`);
        if(audit) {
            audit = JSON.parse(audit);
        } else {
            let resultSet = await this.db("audit").where("id", auditid);
            audit         = resultSet && resultSet.length > 0 ? resultSet[0] : null;
            if(audit) {
                await this.cacheSet(`lease:${audit.id}`, JSON.stringify(audit), 'EX', this.ttlMax);
            }
        }
        return audit;
    }

    /**
     * Retrieves associated activities (transactions) with audit
     * @param auditid
     * @return {Promise<*>}
     */
    async getActivities(auditid) {
        let activities = await this.db("audit_activity").where("auditid_id", auditid).select("tx_hash");
        activities     = _.map(activities, 'tx_hash');
        return activities;
    }

    /**
     * Truncates table and returns deleted rows count
     * @return {Promise<*|string|undefined|Knex.QueryBuilder<any, void>>}
     */
    async truncate() {
        return Promise.all([
            this.db("audit").del(),
            this.db("audit_activity").del()
        ]);
    }
};