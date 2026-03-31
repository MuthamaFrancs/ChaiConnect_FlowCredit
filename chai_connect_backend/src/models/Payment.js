const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
  id:         { type: DataTypes.STRING, primaryKey: true },
  farmerId:   { type: DataTypes.STRING, allowNull: false },
  farmer:     { type: DataTypes.STRING },
  phone:      { type: DataTypes.STRING },
  amount:     { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  deductions: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  net:        { type: DataTypes.DECIMAL(14, 2) },
  status:     { type: DataTypes.STRING, defaultValue: 'Pending' },
  time:       { type: DataTypes.STRING },
  mpesaRef:   { type: DataTypes.STRING },
}, { timestamps: true });

module.exports = Payment;
