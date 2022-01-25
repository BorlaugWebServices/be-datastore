const debug       = require("debug")("be-datastore:DataStore");
const Knex        = require('knex');
const redis       = require("redis");
const waitUntil   = require("async-wait-until");
const {promisify} = require("util");

const Migration   = require("./Migration");
const Block       = require("./Block");
const Transaction = require("./Transaction");
const Inherent    = require("./Inherent");
const Event       = require("./Event");
const Log         = require("./Log");
const Lease       = require("./Lease");
const Identity    = require("./Identity");
const Audit       = require("./Audit");
const Provenance  = require("./Provenance");
const Proposal  = require("./Proposal");
const Group  = require("./Group");

function DataStore(databaseType, databaseUrl, redisHost, redisPort, ttlMin, ttlMax) {
    return (async () => {

        // initialize pg connection
        this.db = await Knex({client: databaseType, connection: databaseUrl, debug: false});

        // test pg connection
        try {
            await this.db.raw('SELECT 1');
            debug("DB connection success");
        } catch(error) {
            debug("DB connection failure");
            throw error;
        }

        // Initialize redis cluster connection
        let cacheStatus = 'UNKNOWN';
        this.cache      = new redis.createClient(redisPort, redisHost)

        this.cache.on("error", function(error) {
            debug("Cache Error", error);
            cacheStatus = 'ERROR';
        });

        this.cache.on("ready", function(data) {
            cacheStatus = 'SUCCESS';
            debug("Cache Ready");
        });

        // Wait until redis is ready or throws error
        await waitUntil(() => {
            return cacheStatus !== 'UNKNOWN'
        }, 6000);

        this.ttlMin = ttlMin || 3600;
        this.ttlMax = ttlMax || 31556952;

        this.migration   = new Migration(this.db);
        this.block       = new Block(this.db, this.cache, this.ttlMin, this.ttlMax);
        this.transaction = new Transaction(this.db, this.cache, this.ttlMin, this.ttlMax);
        this.inherent    = new Inherent(this.db, this.cache, this.ttlMin, this.ttlMax);
        this.event       = new Event(this.db, this.cache, this.ttlMin, this.ttlMax);
        this.log         = new Log(this.db, this.cache, this.ttlMin, this.ttlMax);
        this.lease       = new Lease(this.db, this.cache, this.ttlMin, this.ttlMax);
        this.identity    = new Identity(this.db, this.cache, this.ttlMin, this.ttlMax);
        this.audit       = new Audit(this.db, this.cache, this.ttlMin, this.ttlMax);
        this.provenance  = new Provenance(this.db, this.cache, this.ttlMin, this.ttlMax);
        this.proposal  = new Proposal(this.db, this.cache, this.ttlMin, this.ttlMax);
        this.group  = new Group(this.db, this.cache, this.ttlMin, this.ttlMax);

        this.cleanup = async function() {
            let keys   = await promisify(this.cache.keys).bind(this.cache)("*");
            let length = keys.length;
            debug(`Found %d keys`, length);

            await this.cache.flushdb(function(err, succeeded) {
                debug(succeeded); // will be true if successfull
            });
            debug(`%d keys deleted`, length);

            let [n1, n2, n3, n4, n5, n6, n7, n8, n9, n10] = await Promise.all([
                await this.block.truncate(),
                await this.transaction.truncate(),
                await this.inherent.truncate(),
                await this.event.truncate(),
                await this.log.truncate(),
                await this.lease.truncate(),
                await this.identity.truncate(),
                await this.audit.truncate(),
                await this.provenance.truncate(),
                await this.proposal.truncate(),
                await this.group.truncate()
            ]);
            debug(`${n1},${n2},${n3},${n4},${n5},${n6},${n7},${n8},${n9},${n10} rows deleted`);

            return length;
        }
        return this;
    })();
}

module.exports = DataStore;
