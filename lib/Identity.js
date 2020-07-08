const debug       = require("debug")("be-datastore:Identity");
const {promisify} = require("util"),
      _           = require("lodash");

const DID_PATTERN    = RegExp('^(\w*did:bws:\w*[A-Fa-f0-9]{64})$');
const HASH_PATTERN   = RegExp('^0x([A-Fa-f0-9]{64})$');
const HASH_PATTERN_2 = RegExp('^([A-Fa-f0-9]{64})$');

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
     * Saves identities in Database and Cache with expiry
     * @param identity
     * @return {Promise<void>}
     */
    async save(identity) {
        let dbIdentity = {...identity};
        await this.db("identity").insert(dbIdentity);
        await this.cacheSet(`did:bws:${identity.did}`, JSON.stringify(identity), 'EX', this.ttlMax);
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
        let _did = null;
        if(DID_PATTERN.test(did)) {
            _did = `0x${did.split(":")[2]}`;
        } else if(HASH_PATTERN.test(did)) {
            _did = did
        } else if(HASH_PATTERN_2.test(did)) {
            _did = `0x${did}`;
        } else {
            debug('Invalid did %s ;', did);
            return null;
        }

        let identity = await this.cacheGet(`did:bws:${_did}`);
        if(identity) {
            identity = JSON.parse(identity);
        } else {
            let resultSet = await this.db("identity").where("did", _did);
            identity      = resultSet && resultSet.length > 0 ? resultSet[0] : null;
            if(identity) {
                await this.cacheSet(`did:bws:${_did}`, JSON.stringify(identity), 'EX', this.ttlMin);
            }
        }

        if(identity) {
            identity = {
                ...identity,
                properties: JSON.parse(identity.properties),
                claims: JSON.parse(identity.claims),
                attestations: JSON.parse(identity.attestations)
            }
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