/**
 * Seed a high-scoring "Grade A" farmer with extensive delivery, payment,
 * and loan history so their credit score hits 90+ and they qualify for
 * the maximum KSh 50,000 loan limit.
 *
 * Run: node src/seed-premium-farmer.js
 */
require('dotenv').config();
const { sequelize, Farmer, Delivery, Loan, Payment } = require('./models');

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function seedPremiumFarmer() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to Neon DB');
    await sequelize.sync(); // don't force — keep existing data

    // ── 1. Create the farmer ────────────────────────────────
    const [farmer] = await Farmer.upsert({
      id: 'mary-premium',
      name: 'Mary Wambui',
      phone: '0700100200',
      memberNo: 'MW100',
      factory: 'Kiambu Tea Factory',
      zone: 'Premium Zone',
      cooperative: 'Kiambu Tea Growers SACCO',
      creditScore: 95,        // will be recalculated dynamically
      creditTier: 'A',
      loanFlow: 'eligible',
      gradeTrend: 'A',
      activeSince: '2019-01-15',   // 6+ years → max buyer relationship
      totalKg: 22000,              // well above 15,000 → max volume
      totalEarned: 660000,
    });
    console.log('✅ Created farmer: Mary Wambui (MW100)');

    // ── 2. Create 36 months of delivery history ─────────────
    const deliveries = [];
    for (let month = 0; month < 36; month++) {
      const base = new Date();
      base.setMonth(base.getMonth() - month);
      // 2 deliveries per month
      for (let d = 0; d < 2; d++) {
        const day = 5 + d * 14;
        const date = new Date(base.getFullYear(), base.getMonth(), Math.min(day, 28));
        const kg = 280 + Math.round(Math.random() * 120);
        const grade = Math.random() > 0.15 ? 'A' : 'B';
        const rate = grade === 'A' ? 30 : 25;
        const gross = kg * rate;
        const deductions = Math.round(gross * 0.1);
        deliveries.push({
          id: `mary-d${month}-${d}`,
          farmerId: 'mary-premium',
          date: date.toISOString().slice(0, 10),
          kg,
          grade,
          rate,
          gross,
          deductions,
          net: gross - deductions,
          status: 'Paid',
        });
      }
    }
    await Delivery.bulkCreate(deliveries, { ignoreDuplicates: true });
    console.log(`✅ Seeded ${deliveries.length} deliveries (36 months × 2/month)`);

    // ── 3. Create completed loan history (3 loans fully repaid) ──
    const loans = [
      { id: 'mary-L1', farmerId: 'mary-premium', farmerName: 'Mary Wambui', amount: 30000, interestPct: 8, status: 'Completed', disbursedAt: '2023-03-01', repaidFraction: 1, instalments: 3 },
      { id: 'mary-L2', farmerId: 'mary-premium', farmerName: 'Mary Wambui', amount: 40000, interestPct: 8, status: 'Completed', disbursedAt: '2024-01-15', repaidFraction: 1, instalments: 3 },
      { id: 'mary-L3', farmerId: 'mary-premium', farmerName: 'Mary Wambui', amount: 45000, interestPct: 6, status: 'Completed', disbursedAt: '2024-09-01', repaidFraction: 1, instalments: 3 },
    ];
    await Loan.bulkCreate(loans, { ignoreDuplicates: true });
    console.log('✅ Seeded 3 completed loans (perfect repayment history)');

    // ── 4. Create payment records ────────────────────────────
    const payments = [];
    for (let i = 0; i < 40; i++) {
      payments.push({
        id: `mary-P${i}`,
        farmerId: 'mary-premium',
        farmer: 'Mary Wambui',
        phone: '0700100200',
        amount: 8000 + Math.round(Math.random() * 4000),
        deductions: Math.round(Math.random() * 2000),
        net: 7000 + Math.round(Math.random() * 3000),
        status: 'Paid',
        time: `${daysAgo(i * 7)} 10:${String(i % 60).padStart(2, '0')}`,
        mpesaRef: `MPR${String(100 + i)}`,
      });
    }
    await Payment.bulkCreate(payments, { ignoreDuplicates: true });
    console.log(`✅ Seeded ${payments.length} payment records`);

    // ── 5. Show expected score ───────────────────────────────
    console.log('\n📊 Expected credit score breakdown:');
    console.log('   Delivery Consistency:    ~20/20  (36 delivery months)');
    console.log('   Buyer Relationship:      20/20  (6+ years active)');
    console.log('   Payment Volume:          20/20  (22,000 kg delivered)');
    console.log('   Repayment History:       25/25  (3 loans completed, 0 overdue)');
    console.log('   Transaction Frequency:   15/15  (72 deliveries + 40 payments = 112 tx)');
    console.log('   ─────────────────────────────');
    console.log('   TOTAL SCORE:             ~95-100 / 100');
    console.log('   GRADE:                   A (Low Risk)');
    console.log('   MAX LOAN:                KSh 50,000');
    console.log('\n🚀 Mary Wambui is ready! Open the app and check her credit score.\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

seedPremiumFarmer();
