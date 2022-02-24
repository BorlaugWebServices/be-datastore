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
     * Saves registry in Database and Cache with expiry
     * @param registry
     * @return {Promise<void>}
     */
    async saveRegistry(registry) {
        let id = registry.id;
        let resultSet = await this.db("registry").where("id", id);
        if(resultSet && resultSet.length === 0) {
            await this.db("registry").insert(registry);
        }
        let cache_registry = await this.cacheGet(`registry:${id}`);
        if(!cache_registry) {
            await this.cacheSet(`registry:${Number(id)}`, JSON.stringify(registry), 'EX', this.ttlMax);
        }
    }

    /**
     * Saves activities (transactions) associated with an registry
     * @param activity
     * @return {Promise<void>}
     */
    async saveRegistryActivity(activity) {
        let activities = await this.db("registry_activity").where("registry_id", activity.registry_id)
            .andWhere("tx_hash", activity.tx_hash);
        if (activities && activities.length === 0) {
            await this.db("registry_activity").insert(activity);
        }
    }

    /**
     * Retrieves registry from Cache, if not found in Cache retrieves from Database
     * @param registryid
     * @return {Promise<*>}
     */
    async getRegistry(registryid) {
        if(!NUMBER_PATTERN.test(registryid)) {
            debug('Invalid registry id %s ;', registryid);
            return null;
        }

        let registry = await this.cacheGet(`registry:${registryid}`);
        if(registry) {
            registry = JSON.parse(registry);
        } else {
            let resultSet = await this.db("registry").where("id", registryid);
            registry         = resultSet && resultSet.length > 0 ? resultSet[0] : null;
            if(registry) {
                await this.cacheSet(`registry:${registry.id}`, JSON.stringify(registry), 'EX', this.ttlMax);
            }
        }
        return registry;
    }

    /**
     * Retrieves associated activities (transactions) with registry
     * @param registryid
     * @return {Promise<*>}
     */
    async getRegistryActivities(registryid) {
        let activities = await this.db("registry_activity").where("registry_id", registryid).select("tx_hash");
        activities     = _.map(activities, 'tx_hash');
        return activities;
    }

    /**
     * Saves definition in Database and Cache with expiry
     * @param definition
     * @return {Promise<void>}
     */
    async saveDefinition(definition) {
        let id = definition.id;
        let resultSet = await this.db("definition").where("id", id);
        if(resultSet && resultSet.length === 0) {
            await this.db("definition").insert(definition);
        }
        let cache_definition = await this.cacheGet(`definition:${id}`);
        if(!cache_definition) {
            await this.cacheSet(`definition:${Number(id)}`, JSON.stringify(definition), 'EX', this.ttlMax);
        }
    }

    /**
     * Saves activities (transactions) associated with an definition
     * @param activity
     * @return {Promise<void>}
     */
    async saveDefinitionActivity(activity) {
        let activities = await this.db("definition_activity").where("definition_id", activity.definition_id)
            .andWhere("tx_hash", activity.tx_hash);
        if (activities && activities.length === 0) {
            await this.db("definition_activity").insert(activity);
        }
    }

    /**
     * Retrieves definition from Cache, if not found in Cache retrieves from Database
     * @param definitionid
     * @return {Promise<*>}
     */
    async getDefinition(definitionid) {
        if(!NUMBER_PATTERN.test(definitionid)) {
            debug('Invalid definition id %s ;', definitionid);
            return null;
        }

        let definition = await this.cacheGet(`definition:${definitionid}`);
        if(definition) {
            definition = JSON.parse(definition);
        } else {
            let resultSet = await this.db("definition").where("id", definitionid);
            definition         = resultSet && resultSet.length > 0 ? resultSet[0] : null;
            if(definition) {
                await this.cacheSet(`definition:${definition.id}`, JSON.stringify(definition), 'EX', this.ttlMax);
            }
        }
        return definition;
    }

    /**
     * Retrieves associated activities (transactions) with definition
     * @param definitionid
     * @return {Promise<*>}
     */
    async getDefinitionActivities(definitionid) {
        let activities = await this.db("definition_activity").where("definition_id", definitionid).select("tx_hash");
        activities     = _.map(activities, 'tx_hash');
        return activities;
    }

    /**
     * Saves provenance in Database and Cache with expiry
     * @param sequence
     * @return {Promise<void>}
     */
    async save(sequence) {
        let id = sequence.id;
        debug(sequence)
        let resultSet = await this.db("sequence").where("id", id);
        if(resultSet && resultSet.length === 0) {
            await this.db("sequence").insert(sequence);
        }
        let cache_sequence = await this.cacheGet(`sequence:${id}`);
        if(!cache_sequence) {
            await this.cacheSet(`sequence:${Number(id)}`, JSON.stringify(sequence), 'EX', this.ttlMax);
        }
    }

    /**
     * Saves activities (transactions) associated with an sequence
     * @param activity
     * @return {Promise<void>}
     */
    async saveActivity(activity) {
        let activities = await this.db("sequence_activity").where("sequence_id", activity.sequence_id)
            .andWhere("tx_hash", activity.tx_hash);
        if (activities && activities.length === 0) {
            await this.db("sequence_activity").insert(activity);
        }
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
