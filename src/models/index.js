import { sequelize } from '../config/database.js';
import Pincode from './pincode.model.js';
import WeatherRecord from './weatherRecord.model.js';

export async function initDb() {
  await sequelize.authenticate();
  // In a production setup you'd use migrations. `sync` is fine for
  // this assignment / local development.
  await sequelize.sync();
}

export { sequelize, Pincode, WeatherRecord };
