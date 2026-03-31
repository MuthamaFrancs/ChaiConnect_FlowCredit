require('dotenv').config();
const app = require('./src/app.js');
const { sequelize } = require('./src/models');

const PORT = process.env.PORT || 5001;

// ── Environment Validation (Fail Fast in Production)
if (process.env.NODE_ENV === 'production') {
  const requiredEnvVars = ['DATABASE_URL', 'MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET'];
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  if (missing.length > 0) {
    console.error(`❌ CRITICAL ERROR: Missing required environment variables in production: ${missing.join(', ')}`);
    process.exit(1);
  }
}

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to Neon DB successfully.');

    await sequelize.sync();
    console.log('✅ Database tables ready.');
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ FATAL: Could not connect to database in production. Exiting.');
      process.exit(1);
    } else {
      console.warn('⚠️  DB sync issue (running in mock-data mode locally):', error.message);
    }
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀 ChaiConnect backend running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use. Run: lsof -ti:${PORT} | xargs kill -9`);
    } else {
      console.error('❌ Server error:', err.message);
    }
    process.exit(1);
  });

  // ── Graceful Shutdown (For Docker/Render/Railway)
  const shutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      console.log('HTTP server closed.');
      try {
        await sequelize.close();
        console.log('Database connection closed.');
        process.exit(0);
      } catch (err) {
        console.error('Error during database disconnection:', err);
        process.exit(1);
      }
    });
    
    // Force close after 10 seconds if connections are hanging
    setTimeout(() => {
      console.error('Forcing shutdown due to timeout (10s).');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();
