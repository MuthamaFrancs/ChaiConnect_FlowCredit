const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mpesaService = require('./services/MpesaService');
// routes
const mpesaRoutes = require('./routes/mpesaRoutes');

const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Allow frontend to connect
app.use(morgan('dev')); // Log requests
app.use(express.json()); // Parse JSON bodies
// Mount routes under the v1 namespace so clients calling
// /api/v1/mpesa/disburse will reach these handlers.
app.use('/api/v1/mpesa', mpesaRoutes);

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

// Optional: Fix that 404 on the home page
app.get('/', (req, res) => {
  res.send('☕ ChaiConnect Backend is Live!');
});

app.post('/api/v1/mpesa/disburse', (req, res) => {
  res.json({ success: true, message: 'Mock disburse received', body: req.body });
});

module.exports = app;