import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * Stores the lat/long resolved for a given pincode so we only ever
 * call the Geocoding API once per pincode.
 */
class Pincode extends Model {}

Pincode.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    pincode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    countryCode: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'IN',
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    place: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Pincode',
    tableName: 'pincodes',
    timestamps: true,
    indexes: [{ unique: true, fields: ['pincode', 'countryCode'] }],
  }
);

export default Pincode;
