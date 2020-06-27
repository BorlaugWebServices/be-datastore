const debug       = require("debug")("be-datastore:Test");
const DataStore = require('./lib/DataStore');

const DB_CONNECTION_TYPE = 'pg';
const DB_CONNECTION_URL  = 'postgres://postgres:mysecretpassword@localhost:5432/borlaug';
const REDIS_HOSTS        = ['127.0.0.1','127.0.0.1','127.0.0.1','127.0.0.1','127.0.0.1','127.0.0.1'];
const REDIS_PORTS        = [7000, 7001, 7002, 7003, 7004, 7005];
const TTL                = 7776000;

DataStore(DB_CONNECTION_TYPE, DB_CONNECTION_URL, REDIS_HOSTS, REDIS_PORTS, TTL)
.then(async (store) => {
    console.log("Attempting Migration");
    await store.migration.up();
    console.log("Migration Success");

<<<<<<< Updated upstream
    console.log("Attempting Block Save");
    const input = {
        number: 103153,
        hash: '0x802208ee004b504cb2882c5f8b2476aa5a477e068e93cfc0a1cc816ddc40a6e0',
        parentHash: '0x59b19ac1fd70e91fc4335f7ea08c290efa5dd6d8f3524a774af3ca6ad0b234fc',
        stateRoot: '0xd8dd5bfb593162e95846b01baaf2fe977e0896511372686a0aff574239fe577e',
        extrinsicsRoot: '0x31a423dfb5af5e53506973ba85feccbb3c7bb6abc42276513024e67e25c2f988',
        timestamp: '1587545540000'
    }
    await store.block.save(input);
    console.log("Block Saved");

    console.log("Attempting Block Get");
    const output = await store.block.get(103153);
    console.log("Block Found?", !!output);

    console.log("Block Matched ?", input.hash === output.hash);
=======
    // debug("Attempting Block Save");
    // const input = {
    //     number: 103153,
    //     hash: '0x802208ee004b504cb2882c5f8b2476aa5a477e068e93cfc0a1cc816ddc40a6e0',
    //     parentHash: '0x59b19ac1fd70e91fc4335f7ea08c290efa5dd6d8f3524a774af3ca6ad0b234fc',
    //     stateRoot: '0xd8dd5bfb593162e95846b01baaf2fe977e0896511372686a0aff574239fe577e',
    //     extrinsicsRoot: '0x31a423dfb5af5e53506973ba85feccbb3c7bb6abc42276513024e67e25c2f988',
    //     timestamp: '1587545540000'
    // }
    // await store.block.save(input);
    // debug("Block Saved");
    //
    // debug("Attempting Block Get");
    // const output = await store.block.get(103153);
    // debug("Block Found?", !!output);
    //
    // debug("Block Matched ?", input.hash === output.hash);
>>>>>>> Stashed changes

    console.log("Attempting Rollback");
    await store.migration.down();
    console.log("Rollback Success");

    process.exit();
})
.catch(error => {
    console.error("Failure", error);
    process.exit();
})

