// dbTypes.ts

/** JSON columns coming back from Postgres (via knex/node-pg). */
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [k: string]: JsonValue };

/**
 * BIGINT columns.
 * You asked for strict `number` — note that many Postgres drivers return BIGINT as `string`
 * unless configured otherwise. If you see strings at runtime, you’ll need to adjust driver parsing.
 */
export type DbBigInt = number;

/** Helper for the *_activity tables (join rows). */
export type ActivityRow<IdKey extends string, IdType> = Record<IdKey, IdType> & {
  tx_hash: string | null;
};

/** block */
export type BlockRow = {
  number: number;
  hash: string;
  parentHash: string | null;
  stateRoot: string | null;
  extrinsicsRoot: string | null;
  timestamp: DbBigInt | null;
  significant: boolean | null;
};

/** transaction */
export type TransactionRow = {
  hash: string;
  id: string;
  index: number | null;
  blockNumber: number;
  nonce: string | null;
  signature: string | null;
  signer: string | null;
  isSigned: boolean | null;
  method: JsonValue | null;
  era: JsonValue | null;
  tip: string | null;
  timestamp: DbBigInt | null;
};

/** inherent */
export type InherentRow = {
  id: string;
  index: number | null;
  blockNumber: number;
  isSigned: boolean | null;
  method: JsonValue | null;
  timestamp: DbBigInt | null;
  significant: boolean | null;
};

/** event */
export type EventRow = {
  id: string;
  index: number | null;
  blockNumber: number;
  extrinsicid: string | null;
  phase: JsonValue | null;
  meta: JsonValue | null;
  event: JsonValue | null;
  timestamp: DbBigInt | null;
  significant: boolean | null;
};

/** log */
export type LogRow = {
  id: string;
  index: number | null;
  blockNumber: number;
  log: JsonValue | null;
  timestamp: DbBigInt | null;
  significant: boolean | null;
};

/** identity */
export type IdentityRow = {
  did: string;
  blockNumber: number;
  blockHash: string;
  extrinsicHash: string;
  timestamp: DbBigInt | null;
  subject: string;
  controller: string | null;
};

/** identity_activity */
export type IdentityActivityRow = ActivityRow<'did', string>;

/** asset_registry */
export type AssetRegistryRow = {
  id: string;
  owner: string | null;
  blockNumber: number;
  blockHash: string;
  extrinsicHash: string;
  timestamp: DbBigInt | null;
};

/** asset_registry_activity */
export type AssetRegistryActivityRow = ActivityRow<'registry_id', string>;

/** asset */
export type AssetRow = {
  id: string;
  registry_id: string | null;
  blockNumber: number;
  blockHash: string;
  extrinsicHash: string;
  timestamp: DbBigInt | null;
};

/** asset_activity */
export type AssetActivityRow = ActivityRow<'asset_id', string>;

/** lease */
export type LeaseRow = {
  id: string;
  lessor: string | null;
  lessee: string | null;
  blockNumber: number;
  blockHash: string;
  extrinsicHash: string;
  timestamp: DbBigInt | null;
};

/** lease_activity */
export type LeaseActivityRow = ActivityRow<'lease_id', string>;

/** audit */
export type AuditRow = {
  id: string;
  audit_creator: string;
  auditor: string;
  blockNumber: number;
  blockHash: string;
  extrinsicHash: string;
  timestamp: DbBigInt | null;
};

/** audit_activity */
export type AuditActivityRow = ActivityRow<'audit_id', string>;

/** registry */
export type RegistryRow = {
  id: string;
  creator: string | null;
  creator_group: string | null;
  blockNumber: number;
  blockHash: string;
  extrinsicHash: string;
  timestamp: DbBigInt | null;
};

/** registry_activity */
export type RegistryActivityRow = ActivityRow<'registry_id', string>;

/** definition */
export type DefinitionRow = {
  id: string;
  registry_id: string;
  creator: string | null;
  creator_group: string | null;
  blockNumber: number;
  blockHash: string;
  extrinsicHash: string;
  timestamp: DbBigInt | null;
};

/** definition_activity */
export type DefinitionActivityRow = ActivityRow<'definition_id', string>;

/** sequence */
export type SequenceRow = {
  id: string;
  name: string | null;
  registry: number;
  template: number;
  sequence_creator: string;
  blockNumber: number;
  blockHash: string;
  extrinsicHash: string;
  timestamp: DbBigInt | null;
  sequence_creator_group: string | null;
};

/** sequence_activity */
export type SequenceActivityRow = ActivityRow<'sequence_id', string>;

/** proposal */
export type ProposalRow = {
  id: string;
  proposer: string;
  group_id: string;
  blockNumber: number;
  blockHash: string;
  extrinsicHash: string;
  timestamp: DbBigInt | null;
};

/** proposal_activity */
export type ProposalActivityRow = ActivityRow<'proposal_id', string>;

/** group */
export type GroupRow = {
  id: string;
  group_creator: string;
  blockNumber: number;
  blockHash: string;
  extrinsicHash: string;
  timestamp: DbBigInt | null;
};

/** group_activity */
export type GroupActivityRow = ActivityRow<'group_id', string>;

/** catalog */
export type CatalogRow = {
  id: string;
  caller: string;
  controller: string;
  blockNumber: number;
  blockHash: string;
  extrinsicHash: string;
  timestamp: DbBigInt | null;
};

/** catalog_activity */
export type CatalogActivityRow = ActivityRow<'catalog_id', string>;

/**
 * Table-name -> row-type mapping (useful for typed helpers/repositories).
 * Example: `type RowOf<T extends keyof Tables> = Tables[T]`
 */
export type Tables = {
  block: BlockRow;
  transaction: TransactionRow;
  inherent: InherentRow;
  event: EventRow;
  log: LogRow;

  identity: IdentityRow;
  identity_activity: IdentityActivityRow;

  asset_registry: AssetRegistryRow;
  asset_registry_activity: AssetRegistryActivityRow;

  asset: AssetRow;
  asset_activity: AssetActivityRow;

  lease: LeaseRow;
  lease_activity: LeaseActivityRow;

  audit: AuditRow;
  audit_activity: AuditActivityRow;

  registry: RegistryRow;
  registry_activity: RegistryActivityRow;

  definition: DefinitionRow;
  definition_activity: DefinitionActivityRow;

  sequence: SequenceRow;
  sequence_activity: SequenceActivityRow;

  proposal: ProposalRow;
  proposal_activity: ProposalActivityRow;

  group: GroupRow;
  group_activity: GroupActivityRow;

  catalog: CatalogRow;
  catalog_activity: CatalogActivityRow;
};
