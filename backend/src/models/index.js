/**
 * Models index — NO foreign key constraints.
 * farmerId is a plain string field, not a DB-level FK.
 * This avoids type conflicts with any pre-existing Neon tables
 * and works with the string IDs used throughout the app.
 */
const sequelize = require('../config/database');
const Farmer    = require('./Farmer');
const Delivery  = require('./Delivery');
const Loan      = require('./Loan');
const Payment   = require('./Payment');
const MpesaFeed = require('./MpesaFeed');
const Complaint = require('./Complaint');

// No Sequelize associations — farmerId is a plain string reference.
// This keeps sync() clean and avoids FK type conflicts.

module.exports = { sequelize, Farmer, Delivery, Loan, Payment, MpesaFeed, Complaint };
