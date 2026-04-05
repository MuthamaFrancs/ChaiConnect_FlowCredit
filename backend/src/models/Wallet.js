const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Wallet — one per farmer.
 * balance       → funds available to withdraw
 * pendingBalance → reserved during an in-flight B2C withdrawal
 * totalReceived → lifetime inflow (deposits)
 * totalWithdrawn → lifetime outflow (successful withdrawals)
 */
const Wallet = sequelize.define('Wallet', {
  id:              { type: DataTypes.STRING, primaryKey: true },
  farmerId:        { type: DataTypes.STRING, allowNull: false, unique: true },
  balance:         { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  pendingBalance:  { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  totalReceived:   { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  totalWithdrawn:  { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
}, { timestamps: true });

module.exports = Wallet;
