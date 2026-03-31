const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Loan = sequelize.define('Loan', {
  id:             { type: DataTypes.STRING, primaryKey: true },
  farmerId:       { type: DataTypes.STRING, allowNull: false },
  farmerName:     { type: DataTypes.STRING },
  amount:         { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  interestPct:    { type: DataTypes.DECIMAL(5, 2), defaultValue: 8.00 },
  status:         { type: DataTypes.STRING, defaultValue: 'Active' },
  disbursedAt:    { type: DataTypes.DATEONLY },
  repaidFraction: { type: DataTypes.DECIMAL(5, 4), defaultValue: 0 },
  nextDue:        { type: DataTypes.DATEONLY },
  instalments:    { type: DataTypes.INTEGER, defaultValue: 3 },
}, { timestamps: true });

module.exports = Loan;
