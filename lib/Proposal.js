const debug       = require("debug")("be-datastore:Proposal");
const {promisify} = require("util"),
    _           = require("lodash");

const NUMBER_PATTERN = RegExp('^[0-9]*$');

module.exports = class Proposal {
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
     * Saves proposal in Database and Cache with expiry
     * @param proposal
     * @return {Promise<void>}
     */
    async save(proposal) {
        let id = proposal.id;
        await this.db("proposal").insert(proposal);
        await this.cacheSet(`proposal:${Number(id)}`, JSON.stringify(proposal), 'EX', this.ttlMax);
    }

    /**
     * Saves activities (transactions) associated with an proposal
     * @param activity
     * @return {Promise<void>}
     */
    async saveActivity(activity) {
        await this.db("proposal_activity").insert(activity);
    }

    /**
     * Retrieves lease from Cache, if not found in Cache retrieves from Database
     * @param proposalid
     * @return {Promise<*>}
     */
    async get(proposalid) {
        if(!NUMBER_PATTERN.test(proposalid)) {
            debug('Invalid proposal id %s ;', proposalid);
            return null;
        }

        let proposal = await this.cacheGet(`proposal:${proposalid}`);
        if(proposal) {
            proposal = JSON.parse(proposal);
        } else {
            let resultSet = await this.db("proposal").where("id", proposalid);
            proposal         = resultSet && resultSet.length > 0 ? resultSet[0] : null;
            if(proposal) {
                await this.cacheSet(`proposal:${proposal.id}`, JSON.stringify(proposal), 'EX', this.ttlMax);
            }
        }
        return proposal;
    }

    /**
     * Retrieves associated activities (transactions) with proposal
     * @param proposalid
     * @return {Promise<*>}
     */
    async getActivities(proposalid) {
        let activities = await this.db("proposal_activity").where("proposal_id", proposalid).select("tx_hash");
        activities     = _.map(activities, 'tx_hash');
        return activities;
    }

    /**
     * Truncates table and returns deleted rows count
     * @return {Promise<*|string|undefined|Knex.QueryBuilder<any, void>>}
     */
    async truncate() {
        return Promise.all([
            this.db("proposal").del(),
            this.db("proposal_activity").del()
        ]);
    }
};
