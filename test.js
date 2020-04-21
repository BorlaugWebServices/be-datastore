const {promisify} = require("util");

const DataStore = require('./DataStore');

const DB_CONNECTION_TYPE = 'pg';
const DB_CONNECTION_URL  = 'postgres://postgres:mysecretpassword@localhost:5432/borlaug';
const REDIS_HOSTS        = ['127.0.0.1', '127.0.0.1', '127.0.0.1', '127.0.0.1', '127.0.0.1', '127.0.0.1'];
const REDIS_PORTS        = ['7000', '7001', '7002', '7003', '7004', '7005'];

new DataStore(DB_CONNECTION_TYPE, DB_CONNECTION_URL, REDIS_HOSTS, REDIS_PORTS)
.then(async (store) =>  {
    const set = promisify(store.cache.set).bind(store.cache);
    const get = promisify(store.cache.get).bind(store.cache);
    await set('foo','bar');
    let foo = await get('foo');
    console.log(foo);
})
.catch(error => {
    console.error(error);
})
.finally(() =>{
    process.exit();
})
