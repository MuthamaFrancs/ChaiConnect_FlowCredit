const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Farmer = sequelize.define('Farmer', {
  id:          { type: DataTypes.STRING, primaryKey: true },
  name:        { type: DataTypes.STRING, allowNull: false },
  phone:       { type: DataTypes.STRING },
  memberNo:    { type: DataTypes.STRING, unique: true },
  factory:     { type: DataTypes.STRING },
  zone:        { type: DataTypes.STRING },
  cooperative: { type: DataTypes.STRING },
  creditScore: { type: DataTypes.INTEGER, defaultValue: 50 },
  creditTier:  { type: DataTypes.STRING, defaultValue: 'B' },
  loanFlow:    { type: DataTypes.STRING, defaultValue: 'eligible' },
  gradeTrend:  { type: DataTypes.STRING, defaultValue: 'B' },
  activeSince: { type: DataTypes.DATEONLY },
  totalKg:     { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  totalEarned: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  status:      { type: DataTypes.STRING, defaultValue: 'Active' },
}, { timestamps: true });

module.exports = Farmer;
