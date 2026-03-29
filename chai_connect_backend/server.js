require('dotenv').config();
const app = require('./src/app.js');
const { sequelize } = require('./src/models');

const PORT = process.env.PORT || 5007;

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to Neon DB successfully.');

    // sync() creates tables if they don't exist, leaves existing data untouched
    await sequelize.sync();
    console.log('✅ Database tables ready.');
  } catch (error) {
    // Don't crash — the API routes fall back to mock data automatically
    console.warn('⚠️  DB sync issue (running in mock-data mode):', error.message);
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀 ChaiConnect backend running on http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use. Run: lsof -ti:${PORT} | xargs kill -9`);
    } else {
      console.error('❌ Server error:', err.message);
    }
    process.exit(1);
  });
}

startServer();
