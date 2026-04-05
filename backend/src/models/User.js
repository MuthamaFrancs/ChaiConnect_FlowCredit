const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * User — system accounts for all 4 roles.
 * loginId is role-dependent:
 *   admin   → email
 *   clerk   → employeeId  (e.g. KC-2044)
 *   officer → staffId     (e.g. EXT-889)
 *   farmer  → phone
 */
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('admin', 'clerk', 'officer', 'farmer'),
    allowNull: false,
  },
  // The identifier used to log in (varies by role)
  loginId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'email for admin/officer | employeeId for clerk | phone for farmer',
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: true, // null for farmer (uses OTP instead)
  },
  factoryId: {
    type: DataTypes.STRING,
    defaultValue: 'kiambu',
  },
  // Links a farmer-role user to their Farmer record
  farmerId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, { timestamps: true });

module.exports = User;
