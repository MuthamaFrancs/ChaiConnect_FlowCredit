/**
 * seed-users.js
 * Creates the 4 system users for ChaiConnect.
 * Run with: npm run seed:users
 *
 * Users created:
 *  1. admin   — Makena Wanjiru     (admin@chaiconnect.co.ke / Admin@1234)
 *  2. clerk   — Juma Otieno        (KC-2044 / 2044)
 *  3. officer — Wambui Extension   (EXT-889 / Officer@1234)
 *  4. farmer  — Wanjiku Kamau      (0712345678 / OTP via SMS, demo: 5921)
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User } = require('./models');

const SALT_ROUNDS = 10;

async function seedUsers() {
  try {
    await sequelize.authenticate();
    console.log('✅  DB connected');

    // Sync User table (create if not exists)
    await User.sync({ alter: true });
    console.log('✅  User table synced');

    const users = [
      {
        id:           'u-admin-makena',
        name:         'Makena Wanjiru',
        role:         'admin',
        loginId:      'admin@chaiconnect.co.ke',
        passwordHash: await bcrypt.hash('Admin@1234', SALT_ROUNDS),
        factoryId:    'kiambu',
        farmerId:     null,
      },
      {
        id:           'u-clerk-juma',
        name:         'Juma Otieno',
        role:         'clerk',
        loginId:      'KC-2044',
        passwordHash: await bcrypt.hash('2044', SALT_ROUNDS),
        factoryId:    'kiambu',
        farmerId:     null,
      },
      {
        id:           'u-officer-wambui',
        name:         'Wambui Extension',
        role:         'officer',
        loginId:      'EXT-889',
        passwordHash: await bcrypt.hash('Officer@1234', SALT_ROUNDS),
        factoryId:    'kiambu',
        farmerId:     null,
      },
      {
        id:           'u-farmer-wanjiku',
        name:         'Wanjiku Kamau',
        role:         'farmer',
        loginId:      '0712345678',
        passwordHash: null,  // Farmers use OTP, not passwords
        factoryId:    'kiambu',
        farmerId:     null,  // Link to Farmer record ID if needed
      },
    ];

    let created = 0;
    let skipped = 0;

    for (const u of users) {
      const [, wasCreated] = await User.upsert(u);
      if (wasCreated) {
        console.log(`  ➕ Created: ${u.role.padEnd(7)} — ${u.name} (${u.loginId})`);
        created++;
      } else {
        console.log(`  ⏭  Exists:  ${u.role.padEnd(7)} — ${u.name} (${u.loginId})`);
        skipped++;
      }
    }

    console.log(`\n🌱  Seed complete — ${created} created, ${skipped} already existed`);
    console.log('\nLogin credentials:');
    console.log('  Admin:   admin@chaiconnect.co.ke  /  Admin@1234');
    console.log('  Clerk:   KC-2044                  /  2044');
    console.log('  Officer: EXT-889                  /  Officer@1234');
    console.log('  Farmer:  0712345678               /  OTP (demo: 5921)');

  } catch (err) {
    console.error('❌  Seed failed:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seedUsers();
