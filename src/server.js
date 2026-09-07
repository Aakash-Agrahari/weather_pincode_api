import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app.js';
import { initDb } from './models/index.js';

const PORT = process.env.PORT || 3000;

async function start() {
  await initDb();
  const app = createApp();

  app.listen(PORT, () => {
    console.log(`Weather Info for Pincode API listening on http://localhost:${PORT}`);
    console.log(`Swagger docs available at http://localhost:${PORT}/docs`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
