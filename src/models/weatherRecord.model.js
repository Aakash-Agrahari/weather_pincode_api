import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
import Pincode from './pincode.model.js';

/**
 * Caches the weather information for a given pincode + date so that
 * repeated requests for the same pincode/date do not re-call the
 * external Weather API.
 */
class WeatherRecord extends Model {}

WeatherRecord.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    forDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    temperature: DataTypes.FLOAT,
    feelsLike: DataTypes.FLOAT,
    tempMin: DataTypes.FLOAT,
    tempMax: DataTypes.FLOAT,
    humidity: DataTypes.FLOAT,
    pressure: DataTypes.FLOAT,
    windSpeed: DataTypes.FLOAT,
    weatherMain: DataTypes.STRING,
    weatherDescription: DataTypes.STRING,
    rawResponse: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'WeatherRecord',
    tableName: 'weather_records',
    timestamps: true,
    indexes: [{ unique: true, fields: ['PincodeId', 'forDate'] }],
  }
);

Pincode.hasMany(WeatherRecord, { onDelete: 'CASCADE' });
WeatherRecord.belongsTo(Pincode);

export default WeatherRecord;
