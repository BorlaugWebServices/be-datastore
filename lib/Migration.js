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
                table.string('id').primary().unsigned();
                table.integer('index').unsigned();
                table.integer('blockNumber').notNullable().unsigned();
                table.boolean('isSigned');
                table.json('method');
                table.bigInteger('timestamp').unsigned();
            }),
            this.db.schema.createTable('event', (table) => {
                table.string('id').primary().unsigned();
                table.integer('index').unsigned();
                table.integer('blockNumber').notNullable().unsigned();
                table.string('extrinsicid');
                table.json('phase');
                table.json('meta');
                table.json('event');
                table.bigInteger('timestamp').unsigned();
            }),
            this.db.schema.createTable('log', (table) => {
                table.string('id').primary().unsigned();
                table.integer('index').unsigned();
                table.integer('blockNumber').notNullable().unsigned();
                table.json('log');
                table.bigInteger('timestamp').unsigned();
            }),
            this.db.schema.createTable('lease', (table) => {
                table.string('id').primary().unsigned();
                table.integer('blockNumber').notNullable().unsigned();
                table.string('blockHash').notNullable().unsigned();
                table.string('extrinsicHash').notNullable().unsigned();
                table.string('contractNumber');
                table.json('lessor');
                table.json('lessee');
                table.json('allocations');
                table.bigInteger('effectiveTs');
                table.bigInteger('expiryTs');
                table.bigInteger('timestamp').unsigned();
            })
        ]);
    }

    async down() {
        return Promise.all([
            this.db.schema.dropTable('lease'),
            this.db.schema.dropTable('log'),
            this.db.schema.dropTable('event'),
            this.db.schema.dropTable('inherent'),
            this.db.schema.dropTable('transaction'),
            this.db.schema.dropTable('block')
        ]);
    }
};