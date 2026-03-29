const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Delivery = sequelize.define('Delivery', {
  id:       { type: DataTypes.STRING, primaryKey: true },
  farmerId: { type: DataTypes.STRING, allowNull: false },
  date:     { type: DataTypes.DATEONLY },
  kg:       { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  grade:    { type: DataTypes.STRING },
  rate:     { type: DataTypes.DECIMAL(10, 2) },
  gross:    { type: DataTypes.DECIMAL(12, 2) },
  deductions: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  net:      { type: DataTypes.DECIMAL(12, 2) },
  status:   { type: DataTypes.STRING, defaultValue: 'Pending' },
}, { timestamps: true });

module.exports = Delivery;
