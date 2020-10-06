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
     * Saves provenance in Database and Cache with expiry
     * @param sequence
     * @return {Promise<void>}
     */
    async save(sequence) {
        let id = sequence.id;
        await this.db("sequence").insert(sequence);
        await this.cacheSet(`sequence:${Number(id)}`, JSON.stringify(sequence), 'EX', this.ttlMax);
    }

    /**
     * Saves activities (transactions) associated with an sequence
     * @param activity
     * @return {Promise<void>}
     */
    async saveActivity(activity) {
        await this.db("sequence_activity").insert(activity);
    }

    /**
     * Retrieves lease from Cache, if not found in Cache retrieves from Database
     * @param sequenceid
     * @return {Promise<*>}
     */
    async get(sequenceid) {
        if(!NUMBER_PATTERN.test(sequenceid)) {
            debug('Invalid sequence id %s ;', sequenceid);
            return null;
        }

        let sequence = await this.cacheGet(`sequence:${sequenceid}`);
        if(sequence) {
            sequence = JSON.parse(sequence);
        } else {
            let resultSet = await this.db("sequence").where("id", sequenceid);
            sequence         = resultSet && resultSet.length > 0 ? resultSet[0] : null;
            if(sequence) {
                await this.cacheSet(`sequence:${sequence.id}`, JSON.stringify(sequence), 'EX', this.ttlMax);
            }
        }
        return sequence;
    }

    /**
     * Retrieves associated activities (transactions) with sequence
     * @param sequenceid
     * @return {Promise<*>}
     */
    async getActivities(sequenceid) {
        let activities = await this.db("sequence_activity").where("sequence_id", sequenceid).select("tx_hash");
        activities     = _.map(activities, 'tx_hash');
        return activities;
    }

    /**
     * Truncates table and returns deleted rows count
     * @return {Promise<*|string|undefined|Knex.QueryBuilder<any, void>>}
     */
    async truncate() {
        return Promise.all([
            this.db("sequence").del(),
            this.db("sequence_activity").del()
        ]);
    }
};