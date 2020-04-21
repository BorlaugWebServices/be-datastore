const Knex        = require('knex');
const RedisClient = require("redis");
const RedisClustr = require("redis-clustr");
const waitUntil   = require("async-wait-until");

function DataStore(databaseType, databaseUrl, redisHosts, redisPorts) {
    return (async () => {
        const servers = [];
        if(redisHosts.length !== redisPorts.length) {
            throw new Error("Redis cluster config mismatch");
        } else {
            for(let i = 0; i < redisHosts.length; i++) {
                servers.push({host: redisHosts[i], port: redisPorts[i]})
            }
        }

        this.db = await Knex({client: databaseType, connection: databaseUrl, debug: false});

        try {
            await this.db.raw('SELECT 1');
            console.log("DB connection success")
        } catch(error) {
            console.error("DB connection failure")
            throw error;
        }

        let cacheStatus = 'UNKNOWN';
        let cacheError;
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

        await waitUntil(() => {
            return cacheStatus !== 'UNKNOWN'
        }, 600);

        return this;
    })();
}

module.exports = DataStore;
