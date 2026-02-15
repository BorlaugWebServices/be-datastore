import DataStore from '../lib/DataStore';
import dotenv from 'dotenv';
import path from 'path';

export default async () => {
  const envPath = path.resolve(__dirname, '../.env');
  dotenv.config({path: envPath});
  const store = new DataStore(
    'pg',
    process.env.TEST_DATABASE_URL!,
    process.env.REDIS_HOST!,
    Number(process.env.REDIS_PORT),
    Number(process.env.TTL_MIN),
    Number(process.env.TTL_MAX)
  );
  await store.connect();

  // Wipe and rebuild schema once for the entire test run
  try {
    await store.migration.down();
  } catch (e) {
  }
  await store.migration.up();

  // Important: close connection so Jest can exit
  await store.db.destroy();
  if (store.cache.quit) await store.cache.quit();
};