const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Complaint = sequelize.define('Complaint', {
  id:       { type: DataTypes.STRING, primaryKey: true },
  farmer:   { type: DataTypes.STRING },
  issue:    { type: DataTypes.TEXT },
  status:   { type: DataTypes.STRING, defaultValue: 'Open' },
  date:     { type: DataTypes.DATEONLY },
}, { timestamps: true });

module.exports = Complaint;
