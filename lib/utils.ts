import {promisify} from 'util';
import Debug from 'debug';
import {StoreContext} from './types';
import {ActivityRow} from "./dbTypes";

const debug = Debug('be-datastore:Block');

/**
 * Wraps a Redis method based on the client version with proper type inference.
 */
export const wrapRedis = <T extends (...args: any[]) => any>(
  cache: any,
  method: string,
  isV4: boolean,
): (...args: Parameters<T>) => Promise<ReturnType<T> extends Promise<infer R> ? R : ReturnType<T>> => {
  if (!cache || typeof cache[method] !== 'function') {
    return (async () => null) as any;
  }

  return isV4
    ? cache[method].bind(cache)
    : promisify(cache[method]).bind(cache);
};

/**
 * Generic "getList" helper:
 * - mget + JSON.parse for fast path
 * - falls back to getOne(id) for cache misses (preserves ordering)
 * - filters out nulls
 */
export async function getListCached<T>(
  ids: string[],
  options: {
    ctx: StoreContext;
    keyOf: (id: string) => string;
    getOne: (id: string) => Promise<T | null>;
  },
): Promise<T[]> {
  if (ids.length === 0) return [];

  const keys = ids.map(options.keyOf);
  const cached = await options.ctx.redis.mget(keys);

  const parsed: Array<T | null> = cached.map((value) => {
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch (e) {
      debug('Invalid cached JSON; ignoring. Error: %o ;', e);
      return null;
    }
  });

  const missingIndexes: number[] = [];
  parsed.forEach((item, i) => {
    if (item === null) missingIndexes.push(i);
  });

  if (missingIndexes.length > 0) {
    const fetched = await Promise.all(
      missingIndexes.map((index) => options.getOne(ids[index])),
    );

    fetched.forEach((item, index) => {
      const targetIndex = missingIndexes[index];
      parsed[targetIndex] = item ?? null;
    });
  }

  return parsed.filter((x): x is T => x !== null);
}

/**
 * Generic "get" helper:
 * - cacheGet + safe JSON.parse
 * - falls back to fetchOne (typically DB)
 * - caches fetched value with EX ttlSeconds
 */
export async function getCached<T>(
  id: string,
  ctx: StoreContext,
  options: {
    isValid?: (id: string) => boolean;
    keyOf: (id: string) => string;
    fetchOne: (id: string) => Promise<T | null>;
    ttlSeconds: number | ((value: T) => number);

  },
): Promise<T | null> {
  if (options.isValid && !options.isValid(id)) {
    debug(`Invalid id ${id} ;`);
    return null;
  }

  const key = options.keyOf(id);
  const cached = await ctx.redis.get(key);

  if (cached) {
    try {
      return JSON.parse(cached) as T;
    } catch (e) {
      debug('Invalid cached JSON for key=%s; ignoring. Error: %o ;', key, e);
      // fall through to fetchOne
    }
  }

  const value = await options.fetchOne(id);
  if (!value) return null;

  const ttl = typeof options.ttlSeconds === 'function'
    ? (options.ttlSeconds as (value: T) => number)(value)
    : options.ttlSeconds;

  await ctx.redis.set(key, JSON.stringify(value), 'EX', ttl);
  return value;
}

/**
 * Generic "save" helper:
 * - Checks if record exists in DB, if not inserts it
 * - Checks if record exists in Cache, if not sets it
 */
export async function saveCached<T extends Record<string, any>>(
  data: T,
  ctx: StoreContext,
  options: {
    tableName: string;
    idField: keyof T;
    keyOf: (id: string) => string;
    ttlSeconds: number | ((value: T) => number);
    dbData?: any; // Optional: data to save to DB if different from data to cache
  },
) {
  const id = data[options.idField];
  const dbData = options.dbData || data;

  const resultSet = await ctx.db(options.tableName).where(options.idField as string, id);
  if (resultSet && resultSet.length === 0) {
    await ctx.db(options.tableName).insert(dbData);
  }

  const key = options.keyOf(id);
  const cacheData = await ctx.redis.get(key);
  if (!cacheData) {
    const ttl = typeof options.ttlSeconds === 'function'
      ? (options.ttlSeconds as (value: T) => number)(data)
      : options.ttlSeconds;
    await ctx.redis.set(key, JSON.stringify(data), 'EX', ttl);
  }
}

/**
 * Generic "saveActivity" helper:
 * - Checks if activity exists in DB, if not inserts it
 */
export async function saveActivity<T extends Record<string, any>>(
  activity: T,
  ctx: StoreContext,
  options: {
    tableName: string;
    parentIdField: keyof T;
  },
) {
  const parentId = activity[options.parentIdField];

  const activities = await ctx.db(options.tableName)
    .where(options.parentIdField as string, parentId)
    .andWhere('tx_hash' as string, activity.tx_hash);

  if (activities && activities.length === 0) {
    await ctx.db(options.tableName).insert(activity);
  }
}

/**
 * Generic "getActivities" helper:
 * - Retrieves associated activities (transactions) from DB
 */

export async function getActivities<T extends ActivityRow<string, string>>(
  parentId: string,
  ctx: StoreContext,
  options: {
    tableName: string;
    parentIdField: string;
  },
): Promise<string[]> {
  const activities: T[] = await ctx.db(options.tableName)
    .where(options.parentIdField, parentId)
    .select('tx_hash') as unknown as T[];

  return activities.map((activity) => activity.tx_hash as unknown as string);
}

/**
 * Calculates TTL based on the significance of the object.
 * Returns ttlMax if obj.significant is true, otherwise ttlMin.
 */
export function getTTL(obj: any, ctx: StoreContext): number {
  return obj?.significant ? ctx.ttlMax : ctx.ttlMin;
}
