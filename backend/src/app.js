/**
 * ChaiConnect Express application entry (middleware + routes).
 * Production hardened: Rate limiting, Strict CORS, Global Error Handler.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mpesaService = require('./services/MpesaService');
// route modules
const mpesaRoutes = require('./routes/mpesaRoutes');
const apiRoutes = require('./routes/api');

const app = express();

// ── Security Headers
app.use(helmet()); 

// ── Environment-Aware CORS
// Defaults to open for hackathon/local testing, but locks down if FRONTEND_URL is set
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions)); 

// ── Rate Limiting (Prevent DDoS & Spam)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
});
// Apply rate limiter to all /api routes
app.use('/api', apiLimiter);

// ── Body Parsing & Logging
app.use(express.json());
app.use(morgan('dev'));

// ── Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'ChaiConnect Backend is running securely' });
});

// ── Routes
app.use('/api', apiRoutes);

// ── Global Error Handler
// Catches unhandled errors so the app doesn't crash or leak stack traces to the user
app.use((err, req, res, next) => {
  console.error('❌ [Global Error Handler]:', err.message);
  
  if (process.env.NODE_ENV === 'production') {
    // Hide stack traces in production
    res.status(err.status || 500).json({ 
      error: 'Internal Server Error',
      message: 'Something went wrong on our end.' 
    });
  } else {
    // Show full trace in development mode
    res.status(err.status || 500).json({ 
      error: err.message,
      stack: err.stack 
    });
  }
});

module.exports = app;