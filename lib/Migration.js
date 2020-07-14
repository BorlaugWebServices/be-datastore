const debug       = require("debug")("be-datastore:Migration");
module.exports = class Migration {
    constructor(db) {
        this.db = db;
    }

    async up() {
        return Promise.all([
            this.db.schema.createTable('block', (table) => {
                table.integer('number').primary().unsigned();
                table.string('hash').notNullable();
                table.string('parentHash');
                table.string('stateRoot');
                table.string('extrinsicsRoot');
                table.bigInteger('timestamp').unsigned();
                table.boolean('significant').defaultTo(false);
            }),
            this.db.schema.createTable('transaction', (table) => {
                table.string('hash').primary().unsigned();
                table.string('id').notNullable();
                table.integer('index').unsigned();
                table.integer('blockNumber').notNullable().unsigned();
                table.string('nonce');
                table.string('signature');
                table.string('signer');
                table.boolean('isSigned');
                table.json('method');
                table.json('era');
                table.string('tip');
                table.bigInteger('timestamp').unsigned();
            }),
            this.db.schema.createTable('inherent', (table) => {
                table.string('id').primary();
                table.integer('index').unsigned();
                table.integer('blockNumber').notNullable().unsigned();
                table.boolean('isSigned');
                table.json('method');
                table.bigInteger('timestamp').unsigned();
                table.boolean('significant').defaultTo(false);
            }),
            this.db.schema.createTable('event', (table) => {
                table.string('id').primary();
                table.integer('index').unsigned();
                table.integer('blockNumber').notNullable().unsigned();
                table.string('extrinsicid');
                table.json('phase');
                table.json('meta');
                table.json('event');
                table.bigInteger('timestamp').unsigned();
                table.boolean('significant').defaultTo(false);
            }),
            this.db.schema.createTable('log', (table) => {
                table.string('id').primary();
                table.integer('index').unsigned();
                table.integer('blockNumber').notNullable().unsigned();
                table.json('log');
                table.bigInteger('timestamp').unsigned();
                table.boolean('significant').defaultTo(false);
            }),
            this.db.schema.createTable('identity', (table) => {
                table.string('did').primary();
                table.integer('blockNumber').notNullable().unsigned();
                table.string('blockHash').notNullable();
                table.string('extrinsicHash').notNullable();
                table.bigInteger('timestamp').unsigned();
                table.string('subject').notNullable();
                table.string('controller');
            }),
            this.db.schema.createTable('identity_activity', (table) => {
                table.string('did').notNullable();
                table.string('tx_hash');
                table.unique(['did','tx_hash']);
            }),
            this.db.schema.createTable('lease', (table) => {
                table.string('id').primary();
                table.integer('blockNumber').notNullable().unsigned();
                table.string('blockHash').notNullable();
                table.string('extrinsicHash').notNullable();
                table.string('contractNumber');
                table.json('lessor');
                table.json('lessee');
                table.json('asset');
                table.json('allocations');
                table.bigInteger('effectiveTs');
                table.bigInteger('expiryTs');
                table.bigInteger('timestamp').unsigned();
            }),
            this.db.schema.createTable('lease_activity', (table) => {
                table.string('lease_id').notNullable();
                table.string('tx_hash');
                table.unique(['lease_id','tx_hash']);
            })
        ]);
    }

    async down() {
        return Promise.all([
            this.db.schema.dropTable('lease_activity'),
            this.db.schema.dropTable('lease'),
            this.db.schema.dropTable('identity_activity'),
            this.db.schema.dropTable('identity'),
            this.db.schema.dropTable('log'),
            this.db.schema.dropTable('event'),
            this.db.schema.dropTable('inherent'),
            this.db.schema.dropTable('transaction'),
            this.db.schema.dropTable('block')
        ]);
    }
};