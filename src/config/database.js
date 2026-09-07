import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use an in-memory DB for tests so runs are fast, isolated and don't
// touch the developer's local data file.
const isTest = process.env.NODE_ENV === 'test';

const storagePath = isTest
  ? ':memory:'
  : path.resolve(process.cwd(), process.env.DB_STORAGE_PATH || './data/weather.sqlite');

if (!isTest) {
  const dir = path.dirname(storagePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: storagePath,
  logging: false,
});

export default sequelize;
