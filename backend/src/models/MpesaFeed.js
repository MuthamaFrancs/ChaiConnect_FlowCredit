const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MpesaFeed = sequelize.define('MpesaFeed', {
  id:        { type: DataTypes.STRING, primaryKey: true },
  type:      { type: DataTypes.STRING },
  farmer:    { type: DataTypes.STRING },
  phone:     { type: DataTypes.STRING },
  amount:    { type: DataTypes.DECIMAL(14, 2) },
  direction: { type: DataTypes.STRING },
  code:      { type: DataTypes.STRING },
  ts:        { type: DataTypes.STRING },
  raw:       { type: DataTypes.JSONB },
}, { timestamps: true });

module.exports = MpesaFeed;
