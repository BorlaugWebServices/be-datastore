const debug       = require("debug")("be-datastore:Identity");
const {promisify} = require("util"),
      _           = require("lodash");

const DID_PATTERN    = RegExp('^(\w*did:bws:\w*[A-Fa-f0-9]{64})$');
const HASH_PATTERN   = RegExp('^0x([A-Fa-f0-9]{64})$');
const HASH_PATTERN_2 = RegExp('^([A-Fa-f0-9]{64})$');
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
     * Saves identities in Database and Cache with expiry
     * @param identity
     * @return {Promise<void>}
     */
    async save(identity) {
        let dbIdentity = {...identity};
        let resultSet = await this.db("identity").where("did", identity.did);
        if(resultSet && resultSet.length === 0) {
            await this.db("identity").insert(dbIdentity);
        }
        let cache_identity = await this.cacheGet(`did:bws:${identity.did}`);
        if(!cache_identity) {
            await this.cacheSet(`did:bws:${identity.did}`, JSON.stringify(identity), 'EX', this.ttlMax);
        }
    }

    /**
     * Saves catalog in Database and Cache with expiry
     * @param identity
     * @return {Promise<void>}
     */
    async save_catalog(catalog) {
        let dbCatalog = {...catalog};
        let resultSet = await this.db("catalog").where("id", catalog.id);
        if(resultSet && resultSet.length === 0) {
            await this.db("catalog").insert(dbCatalog);
        }
        let cache_catalog = await this.cacheGet(`catalog:${catalog.id}`);
        if(!cache_catalog) {
            await this.cacheSet(`catalog:${catalog.id}`, JSON.stringify(catalog), 'EX', this.ttlMax);
        }
    }

    /**
     * Saves activities (transactions) associated with a catalog
     * @param activity
     * @return {Promise<void>}
     */
    async saveCatalogActivity(activity) {
        let activities = await this.db("catalog_activity").where("catalog_id", activity.catalog_id)
            .andWhere("tx_hash", activity.tx_hash);
        if (activities && activities.length === 0) {
            await this.db("catalog_activity").insert(activity);
        }
    }

    /**
     * Retrieves catalog from Cache, if not found in Cache retrieves from Database
     * @param catalogid
     * @return {Promise<*>}
     */
    async get_catalog(catalogid) {
        if(!NUMBER_PATTERN.test(catalogid)) {
            debug('Invalid catalog id %s ;', catalogid);
            return null;
        }
        let catalog = await this.cacheGet(`catalog:${catalogid}`);
        if(catalog) {
            catalog = JSON.parse(catalog);
        } else {
            let resultSet = await this.db("catalog").where("id", catalogid);
            catalog         = resultSet && resultSet.length > 0 ? resultSet[0] : null;
            if(catalog) {
                await this.cacheSet(`catalog:${catalog.id}`, JSON.stringify(catalog), 'EX', this.ttlMax);
            }
        }
        return catalog;
    }

    /**
     * Saves activities (transactions) associated with a lease
     * @param activity
     * @return {Promise<void>}
     */
    async saveActivity(activity) {
        let activities = await this.db("identity_activity").where("did", activity.did)
            .andWhere("tx_hash", activity.tx_hash);
        if (activities && activities.length === 0) {
            await this.db("identity_activity").insert(activity);
        }
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
                await this.cacheSet(`did:bws:${_did}`, JSON.stringify(identity), 'EX', this.ttlMax);
            }
        }

        return identity;
    }

    /**
     * Retrieves associated activities (transactions) with identity
     * @param did
     * @return {Promise<*>}
     */
    async getCatalogActivities(id) {
        let activities = await this.db("catalog_activity").where("catalog_id", id).select("tx_hash");
        activities     = _.map(activities, 'tx_hash');
        return activities;
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
