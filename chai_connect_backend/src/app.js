/**
 * ChaiConnect Express application entry (middleware + routes).
 * Demo JSON APIs are mounted at /api; production can add auth and real Daraja webhooks here.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mpesaService = require('./services/MpesaService');
// route modules
const mpesaRoutes = require('./routes/mpesaRoutes');
const apiRoutes = require('./routes/api');

const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors(
  {
  origin: [
    "http://localhost:5173", // local dev
    "https://your-vercel-app.vercel.app" // production frontend
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}
)); // Allow frontend to connect
app.use(morgan('dev')); // Log requests
app.use(express.json()); // Parse JSON bodies
// Mount routes under the v1 namespace so clients calling
// /api/mpesa/disburse will reach these handlers.
app.use('/api/mpesa', mpesaRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'ChaiConnect Backend is running' });
});

app.get('/test-mpesa-token', async (req, res) => {
  try {
    const token = await mpesaService.getAccessToken();
    res.json({ success: true, token });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.use('/api', apiRoutes);

module.exports = app;