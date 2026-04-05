const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * WalletTx — ledger of every wallet movement.
 * type: deposit | withdrawal | loan_disbursement | loan_repayment | cooperative_payment
 * status: pending | completed | failed
 */
const WalletTx = sequelize.define('WalletTx', {
  id:            { type: DataTypes.STRING, primaryKey: true },
  farmerId:      { type: DataTypes.STRING, allowNull: false },
  walletId:      { type: DataTypes.STRING, allowNull: false },
  type:          { type: DataTypes.STRING, allowNull: false },   // deposit | withdrawal | ...
  amount:        { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  grossAmount:   { type: DataTypes.DECIMAL(14, 2) },            // before deductions
  deduction:     { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  deductionType: { type: DataTypes.STRING },                    // e.g. 'loan_repayment'
  status:        { type: DataTypes.STRING, defaultValue: 'pending' },
  reference:     { type: DataTypes.STRING },                    // delivery ID, payment ID, etc.
  mpesaReceipt:  { type: DataTypes.STRING },                    // Daraja ConversationID / TransID
  balanceAfter:  { type: DataTypes.DECIMAL(14, 2) },            // snapshot after this tx
  note:          { type: DataTypes.TEXT },
}, { timestamps: true });

module.exports = WalletTx;
