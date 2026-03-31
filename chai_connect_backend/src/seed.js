require('dotenv').config();
const { sequelize, Farmer, Delivery, Loan, Payment, MpesaFeed, Complaint } = require('./models');
const { FARMERS, RECENT_PAYMENTS, DELIVERIES, LOANS, MPESA_FEED, COMPLAINTS } = require('./data/seedPayload');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to Neon DB');

    await sequelize.sync({ force: true });
    console.log('✅ Tables dropped + recreated');

    await Farmer.bulkCreate(FARMERS, { ignoreDuplicates: true });
    console.log(`✅ Seeded ${FARMERS.length} farmers`);

    await Delivery.bulkCreate(DELIVERIES, { ignoreDuplicates: true });
    console.log(`✅ Seeded ${DELIVERIES.length} deliveries`);

    await Loan.bulkCreate(LOANS, { ignoreDuplicates: true });
    console.log(`✅ Seeded ${LOANS.length} loans`);

    await Payment.bulkCreate(RECENT_PAYMENTS, { ignoreDuplicates: true });
    console.log(`✅ Seeded ${RECENT_PAYMENTS.length} payments`);

    await MpesaFeed.bulkCreate(MPESA_FEED, { ignoreDuplicates: true });
    console.log(`✅ Seeded ${MPESA_FEED.length} M-Pesa feed entries`);

    await Complaint.bulkCreate(COMPLAINTS, { ignoreDuplicates: true });
    console.log(`✅ Seeded ${COMPLAINTS.length} complaints`);

    console.log('\n🚀 Database seeded successfully! Your Neon DB is live with real data.\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

seed();
