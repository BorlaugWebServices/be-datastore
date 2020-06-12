const debug       = require("debug")("be-datastore:Inherent");
const {promisify} = require("util"),
      _           = require("lodash");

const ID_PATTERN     = RegExp('^[0-9]*-[0-9]*$');

module.exports = class Inherent {
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
     * @param inherent
     * @return {Promise<void>}
     */
    async save(inherent) {
        let dbInherent = {...inherent};
        delete dbInherent.events;
        await this.db("inherent").insert(dbInherent);
        await this.cacheSet(`inh:${inherent.id}`, JSON.stringify(inherent), 'EX', this.ttl);
    }

    /**
     * Retrieves inherent from Cache, if not found in Cache retrieves from Database
     * @param inherentid
     * @return {Promise<*>}
     */
    async get(inherentid) {
        if(!ID_PATTERN.test(inherentid)){
            debug('Invalid inherent id %s ;', inherentid);
            return null;
        }

        let inherent = await this.cacheGet(`inh:${inherentid}`);
        if(inherent) {
            inherent = JSON.parse(inherent);
        } else {
            let resultSet = await this.db("inherent").where("id", inherentid);
            inherent      = resultSet && resultSet.length > 0 ? resultSet[0] : null;
            if(inherent){
                inherent["events"] = _.map(await this.db("event").select("id").where("extrinsicid", inherent.id), function(event) {
                    return event.id
                });
            }
            await this.cacheSet(`inh:${inherent.id}`, JSON.stringify(inherent), 'EX', this.ttl);
        }
        return inherent;
    }

    /**
     * Retrieves n inherents from Cache, if n inherents are not found in Cache then retrieves from Database; n is length of inherentids
     * @param inherentids
     * @return {Promise<*>}
     */
    async getList(inherentids) {
        let keys      = _.map(inherentids, function(inherentid) {
            return `inh:${inherentid}`
        });
        let inherents = await this.cacheMget(keys);
        _.remove(inherents, function(inherent) {
            return inherent === null;
        });
        if(inherents.length === keys.length) {
            inherents = _.map(inherents, async function(inherent) {
                return JSON.parse(inherent)
            });
        } else {
            inherents = await this.db("inherent").whereIn("id", inherentids);
            _.map(inherents, async(inherent) => {
                await this.cacheSet(`inh:${inherent.id}`, JSON.stringify(inherent), 'EX', this.ttl);
            });
        }
        return inherents;
    }

    /**
     * Truncates table and returns deleted rows count
     * @return {Promise<*|string|undefined|Knex.QueryBuilder<any, void>>}
     */
    async truncate(){
        return this.db("inherent").del();
    }
};