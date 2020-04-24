const Knex        = require('knex');
const RedisClient = require("redis");
const RedisClustr = require("redis-clustr");
const waitUntil   = require("async-wait-until");

const Migration   = require("./Migration");
const Block       = require("./Block");
const Transaction = require("./Transaction");
const Inherent    = require("./Inherent");
const Event       = require("./Event");
const Log         = require("./Log");

function DataStore(databaseType, databaseUrl, redisHosts, redisPorts, ttl) {
    return (async () => {
        const servers = [];
        if(redisHosts.length !== redisPorts.length) {
            throw new Error("Redis cluster config mismatch");
        } else {
            for(let i = 0; i < redisHosts.length; i++) {
                servers.push({host: redisHosts[i], port: redisPorts[i]})
            }
        }

        // initialize pg connection
        this.db = await Knex({client: databaseType, connection: databaseUrl, debug: false});

        // test pg connection
        try {
            await this.db.raw('SELECT 1');
            console.log("DB connection success")
        } catch(error) {
            console.error("DB connection failure")
            throw error;
        }

        // Initialize redis cluster connection
        let cacheStatus = 'UNKNOWN';
        this.cache      = new RedisClustr({
            servers: servers,
            createClient: function(port, host) {
                return RedisClient.createClient(port, host);
            }
        });

        this.cache.on('error', (error) => {
            cacheStatus = 'ERROR';
            console.log('Cache error %o', error.message);
            throw error;
        });

        this.cache.on('connectionError', (error) => {
            cacheStatus = 'ERROR';
            console.log('Cache connection Error %o', error.message);
            throw error;
        });

        this.cache.on('fullReady', () => {
            cacheStatus = 'SUCCESS';
            console.log('Cache connection success');
        });

        // Wait until redis cluster is ready or throws error
        await waitUntil(() => {
            return cacheStatus !== 'UNKNOWN'
        }, 600);

        this.ttl = ttl || 7776000;

        this.migration   = new Migration(this.db);
        this.block       = new Block(this.db, this.cache, this.ttl);
        this.transaction = new Transaction(this.db, this.cache, this.ttl);
        this.inherent    = new Inherent(this.db, this.cache, this.ttl);
        this.event       = new Event(this.db, this.cache, this.ttl);
        this.log         = new Log(this.db, this.cache, this.ttl);

        return this;
    })();
}

module.exports = DataStore;
