const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
      // Prevent individual queries from hanging
      statement_timeout: 8000,   // 8s max per query
      idle_in_transaction_session_timeout: 10000,
    },
    pool: {
      max: 5,
      min: 1,           // Keep 1 connection alive (prevents Neon cold start)
      acquire: 10000,   // 10s to get a connection (was 30s — too slow)
      idle: 30000,      // Keep idle connections 30s before recycling
      evict: 15000,     // Check for stale connections every 15s
    },
    retry: {
      max: 2,            // Retry failed queries once
    },
  });

  // Warm the connection pool immediately so first request isn't slow
  sequelize.query('SELECT 1').catch(() => {});
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS || '',
    {
      host: process.env.DB_HOST || 'localhost',
      dialect: 'postgres',
      logging: false,
      pool: { max: 5, min: 0, acquire: 10000, idle: 10000 },
    }
  );
}

module.exports = sequelize;
