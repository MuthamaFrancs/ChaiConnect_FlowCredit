/**
 * Seeds the Neon Postgres database with the same data
 * that the React frontend currently uses as mock data.
 */
require('dotenv').config();
const { sequelize, Farmer, Delivery, Loan, Payment, MpesaFeed, Complaint } = require('./models');
const { FARMERS, RECENT_PAYMENTS, DELIVERIES, LOANS, MPESA_FEED, COMPLAINTS } = require('./data/seedPayload');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to Neon DB');

    // Wipe and recreate all tables
    await sequelize.sync({ force: true });
    console.log('✅ Tables synced (force)');

    // 1. Farmers
    await Farmer.bulkCreate(FARMERS, { ignoreDuplicates: true });
    console.log(`✅ Seeded ${FARMERS.length} farmers`);

    // 2. Deliveries
    await Delivery.bulkCreate(DELIVERIES, { ignoreDuplicates: true });
    console.log(`✅ Seeded ${DELIVERIES.length} deliveries`);

    // 3. Loans
    await Loan.bulkCreate(LOANS, { ignoreDuplicates: true });
    console.log(`✅ Seeded ${LOANS.length} loans`);

    // 4. Payments
    await Payment.bulkCreate(RECENT_PAYMENTS, { ignoreDuplicates: true });
    console.log(`✅ Seeded ${RECENT_PAYMENTS.length} payments`);

    // 5. MpesaFeed
    await MpesaFeed.bulkCreate(MPESA_FEED, { ignoreDuplicates: true });
    console.log(`✅ Seeded ${MPESA_FEED.length} M-Pesa feed entries`);

    // 6. Complaints
    await Complaint.bulkCreate(COMPLAINTS, { ignoreDuplicates: true });
    console.log(`✅ Seeded ${COMPLAINTS.length} complaints`);

    console.log('\n🚀 Database seeded successfully! Your Neon DB is live.\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
