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
     * Saves asset registry in Database and Cache
     * @param registry
     * @return {Promise<void>}
     */
    async saveRegistry(registry) {
        let dbRegistry = {...registry};
        let resultSet = await this.db("asset_registry").where("id", registry.id);
        if(resultSet && resultSet.length === 0) {
            await this.db("asset_registry").insert(dbRegistry);
        }
        let cache_registry = await this.cacheGet(`asset_registry:${registry.id}`);
        if(!cache_registry) {
            await this.cacheSet(`asset_registry:${registry.id}`, JSON.stringify(registry), 'EX', this.ttlMax);
        }
    }

    /**
     * Saves activities (transactions) associated with a asset registry
     * @param activity
     * @returns {Promise<void>}
     */
    async saveRegistryActivity(activity) {
        let activities = await this.db("asset_registry_activity").where("registry_id", activity.registry_id)
            .andWhere("tx_hash", activity.tx_hash);
        if (activities && activities.length === 0) {
            await this.db("asset_registry_activity").insert(activity);
        }
    }

    /**
     * Retrieves lease from Cache, if not found in Cache retrieves from Database
     * @param leaseid
     * @return {Promise<*>}
     */
    async getRegistry(registryid) {
        if(!NUMBER_PATTERN.test(registryid)) {
            debug('Invalid lease id %s ;', registryid);
            return null;
        }

        let asset_registry = await this.cacheGet(`asset_registry:${registryid}`);
        if(asset_registry) {
            asset_registry = JSON.parse(asset_registry);
        } else {
            let resultSet = await this.db("asset_registry").where("id", registryid);
            asset_registry         = resultSet && resultSet.length > 0 ? resultSet[0] : null;
            if(asset_registry) {
                await this.cacheSet(`asset_registry:${registryid}`, JSON.stringify(asset_registry), 'EX', this.ttlMax);
            }
        }
        return asset_registry;
    }

    /**
     * Retrieves associated activities (transactions) with lease
     * @param registryid
     * @return {Promise<*>}
     */
    async getRegistryActivities(registryid) {
        let activities = await this.db("asset_registry_activity").where("registry_id", registryid).select("tx_hash");
        activities     = _.map(activities, 'tx_hash');
        return activities;
    }

    /**
     * Saves asset asset in Database and Cache
     * @param asset
     * @return {Promise<void>}
     */
    async saveAsset(asset) {
        let dbAsset = {...asset};
        let resultSet = await this.db("asset").where("id", asset.id);
        if(resultSet && resultSet.length === 0) {
            await this.db("asset").insert(dbAsset);
        }
        let cache_asset = await this.cacheGet(`asset:${asset.id}`);
        if(!cache_asset) {
            await this.cacheSet(`asset:${asset.id}`, JSON.stringify(asset), 'EX', this.ttlMax);
        }
    }

    /**
     * Saves activities (transactions) associated with a asset
     * @param activity
     * @returns {Promise<void>}
     */
    async saveAssetActivity(activity) {
        let activities = await this.db("asset_activity").where("asset_id", activity.asset_id)
            .andWhere("tx_hash", activity.tx_hash);
        if (activities && activities.length === 0) {
            await this.db("asset_activity").insert(activity);
        }
    }

    /**
     * Retrieves asset from Cache, if not found in Cache retrieves from Database
     * @param assetid
     * @return {Promise<*>}
     */
    async getAsset(assetid) {
        if(!NUMBER_PATTERN.test(assetid)) {
            debug('Invalid asset id %s ;', assetid);
            return null;
        }

        let asset = await this.cacheGet(`asset:${assetid}`);
        if(asset) {
            asset = JSON.parse(asset);
        } else {
            let resultSet = await this.db("asset").where("id", assetid);
            asset         = resultSet && resultSet.length > 0 ? resultSet[0] : null;
            if(asset) {
                await this.cacheSet(`asset:${assetid}`, JSON.stringify(asset), 'EX', this.ttlMax);
            }
        }
        return asset;
    }

    /**
     * Retrieves associated activities (transactions) with asset
     * @param assetid
     * @return {Promise<*>}
     */
    async getAssetActivities(assetid) {
        let activities = await this.db("asset_activity").where("asset_id", assetid).select("tx_hash");
        activities     = _.map(activities, 'tx_hash');
        return activities;
    }

    /**
     * Saves lease in Database and Cache
     * @param lease
     * @return {Promise<void>}
     */
    async saveLease(lease) {
        let dbLease = {...lease};
        let resultSet = await this.db("lease").where("id", lease.id);
        if(resultSet && resultSet.length === 0) {
            await this.db("lease").insert(dbLease);
        }
        let cache_lease = await this.cacheGet(`lease:${lease.id}`);
        if(!cache_lease) {
            await this.cacheSet(`lease:${lease.id}`, JSON.stringify(lease), 'EX', this.ttlMax);
        }
    }

    /**
     * Saves activities (transactions) associated with a lease
     * @param activity
     * @returns {Promise<void>}
     */
    async saveLeaseActivity(activity) {
        let activities = await this.db("lease_activity").where("lease_id", activity.lease_id)
            .andWhere("tx_hash", activity.tx_hash);
        if (activities && activities.length === 0) {
            await this.db("lease_activity").insert(activity);
        }
    }

    /**
     * Retrieves lease from Cache, if not found in Cache retrieves from Database
     * @param leaseid
     * @return {Promise<*>}
     */
    async getLease(leaseid) {
        if(!NUMBER_PATTERN.test(leaseid)) {
            debug('Invalid lease id %s ;', leaseid);
            return null;
        }

        let lease = await this.cacheGet(`lease:${leaseid}`);
        if(lease) {
            lease = JSON.parse(lease);
        } else {
            let resultSet = await this.db("lease").where("id", leaseid);
            lease         = resultSet && resultSet.length > 0 ? resultSet[0] : null;
            if(lease) {
                await this.cacheSet(`lease:${leaseid}`, JSON.stringify(lease), 'EX', this.ttlMax);
            }
        }
        return lease;
    }

    /**
     * Retrieves associated activities (transactions) with lease
     * @param leaseid
     * @return {Promise<*>}
     */
    async getLeaseActivities(leaseid) {
        let activities = await this.db("lease_activity").where("lease_id", leaseid).select("tx_hash");
        activities     = _.map(activities, 'tx_hash');
        return activities;
    }

    /**
     * Truncates table and returns deleted rows count
     * @return {Promise<*|string|undefined|Knex.QueryBuilder<any, void>>}
     */
    async truncate() {
        return Promise.all([
            this.db("lease").del(),
            this.db("lease_activity").del()
        ]);
    }
};
