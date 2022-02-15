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
            this.db.schema.createTable('asset_registry', (table) => {
                table.string('id').primary();
                table.string('owner');
                table.integer('blockNumber').notNullable().unsigned();
                table.string('blockHash').notNullable();
                table.string('extrinsicHash').notNullable();
                table.bigInteger('timestamp').unsigned();
            }),
            this.db.schema.createTable('asset_registry_activity', (table) => {
                table.string('registry_id').notNullable();
                table.string('tx_hash');
                table.unique(['registry_id','tx_hash']);
            }),
            this.db.schema.createTable('asset', (table) => {
                table.string('id').primary();
                table.string('registry_id');
                table.integer('blockNumber').notNullable().unsigned();
                table.string('blockHash').notNullable();
                table.string('extrinsicHash').notNullable();
                table.bigInteger('timestamp').unsigned();
            }),
            this.db.schema.createTable('asset_activity', (table) => {
                table.string('asset_id').notNullable();
                table.string('tx_hash');
                table.unique(['asset_id','tx_hash']);
            }),
            this.db.schema.createTable('lease', (table) => {
                table.string('id').primary();
                table.string('lessor');
                table.string('lessee');
                table.integer('blockNumber').notNullable().unsigned();
                table.string('blockHash').notNullable();
                table.string('extrinsicHash').notNullable();
                table.bigInteger('timestamp').unsigned();
            }),
            this.db.schema.createTable('lease_activity', (table) => {
                table.string('lease_id').notNullable();
                table.string('tx_hash');
                table.unique(['lease_id','tx_hash']);
            }),
            this.db.schema.createTable('audit', (table) => {
                table.integer('id').primary();
                table.string('audit_creator').notNullable();
                table.string('auditor').notNullable();
                table.integer('blockNumber').notNullable().unsigned();
                table.string('blockHash').notNullable();
                table.string('extrinsicHash').notNullable();
                table.bigInteger('timestamp').unsigned();
            }),
            this.db.schema.createTable('audit_activity', (table) => {
                table.integer('audit_id').notNullable();
                table.string('tx_hash');
                table.unique(['audit_id','tx_hash']);
            }),
            this.db.schema.createTable('sequence', (table) => {
                table.integer('id').primary();
                table.string('name');
                table.integer('registry').notNullable();
                table.integer('template').notNullable();
                table.string('sequence_creator').notNullable();
                table.integer('blockNumber').notNullable().unsigned();
                table.string('blockHash').notNullable();
                table.string('extrinsicHash').notNullable();
                table.bigInteger('timestamp').unsigned();
                table.string('sequence_creator_group');
            }),
            this.db.schema.createTable('sequence_activity', (table) => {
                table.integer('sequence_id').notNullable();
                table.string('tx_hash');
                table.unique(['sequence_id','tx_hash']);
            }),
            this.db.schema.createTable('proposal', (table) => {
                table.integer('id').primary();
                table.string('proposer').notNullable();
                table.string('group_id').notNullable();
                table.integer('blockNumber').notNullable().unsigned();
                table.string('blockHash').notNullable();
                table.string('extrinsicHash').notNullable();
                table.bigInteger('timestamp').unsigned();
            }),
            this.db.schema.createTable('proposal_activity', (table) => {
                table.integer('proposal_id').notNullable();
                table.string('tx_hash');
                table.unique(['proposal_id','tx_hash']);
            }),
            this.db.schema.createTable('group', (table) => {
                table.integer('id').primary();
                table.string('group_creator').notNullable();
                table.integer('blockNumber').notNullable().unsigned();
                table.string('blockHash').notNullable();
                table.string('extrinsicHash').notNullable();
                table.bigInteger('timestamp').unsigned();
            }),
            this.db.schema.createTable('group_activity', (table) => {
                table.integer('group_id').notNullable();
                table.string('tx_hash');
                table.unique(['group_id','tx_hash']);
            }),
            this.db.schema.createTable('catalog', (table) => {
                table.integer('id').primary();
                table.string('caller').notNullable();
                table.string('controller').notNullable();
                table.integer('blockNumber').notNullable().unsigned();
                table.string('blockHash').notNullable();
                table.string('extrinsicHash').notNullable();
                table.bigInteger('timestamp').unsigned();
            }),
            this.db.schema.createTable('catalog_activity', (table) => {
                table.integer('catalog_id').notNullable();
                table.string('tx_hash');
                table.unique(['catalog_id','tx_hash']);
            }),
        ]);
    }

    async down() {
        return Promise.all([
            this.db.schema.dropTable('sequence_activity'),
            this.db.schema.dropTable('sequence'),
            this.db.schema.dropTable('audit_activity'),
            this.db.schema.dropTable('audit'),
            this.db.schema.dropTable('asset_registry_activity'),
            this.db.schema.dropTable('asset_registry'),
            this.db.schema.dropTable('asset_activity'),
            this.db.schema.dropTable('asset'),
            this.db.schema.dropTable('lease_activity'),
            this.db.schema.dropTable('lease'),
            this.db.schema.dropTable('identity_activity'),
            this.db.schema.dropTable('identity'),
            this.db.schema.dropTable('log'),
            this.db.schema.dropTable('event'),
            this.db.schema.dropTable('inherent'),
            this.db.schema.dropTable('transaction'),
            this.db.schema.dropTable('block'),
            this.db.schema.dropTable('proposal_activity'),
            this.db.schema.dropTable('proposal'),
            this.db.schema.dropTable('group'),
            this.db.schema.dropTable('group_activity'),
            this.db.schema.dropTable('catalog'),
            this.db.schema.dropTable('catalog_activity')
        ]);
    }
};
