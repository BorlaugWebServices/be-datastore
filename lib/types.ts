import {Knex} from 'knex';
import {BlockRow, EventRow, InherentRow, LogRow, TransactionRow} from './dbTypes';
import Block from "./Block";
import Transaction from "./Transaction";
import Inherent from "./Inherent";
import Event from "./Event";
import Log from "./Log";

export type RedisGet = (key: string) => Promise<string | null>;
export type RedisMGet = (keys: string[]) => Promise<(string | null)[]>;
export type RedisSet = (key: string, value: string, mode?: 'EX', duration?: number) => Promise<string | void>;
export type RedisPublish = (channel: string, message: string) => Promise<number>;

export interface StoreContext {
  db: Knex;
  ttlMin: number;
  ttlMax: number;
  isV4plus: boolean;
  redis: {
    get: RedisGet;
    set: RedisSet;
    mget: RedisMGet;
    publish: RedisPublish;
  };
  transaction: Transaction;
  block: Block;
  inherent: Inherent;
  event: Event;
  log: Log;
}

export interface FullBlock extends BlockRow {
  transactions?: string[];
  inherents?: string[];
  events?: string[];
  logs?: string[];
}

export interface BlockExpanded extends BlockRow {
  transactions?: TransactionRow[];
  inherents?: FullInherent[];
  events?: EventRow[];
  logs?: LogRow[];
}

export interface FullInherent extends InherentRow {
  events?: string[];
}

export interface FullTransaction extends TransactionRow {
  events?: string[];
}
