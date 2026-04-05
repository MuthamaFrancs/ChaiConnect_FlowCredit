const express = require('express');
const { login, requestOtp, me, logout } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Public — no token needed
router.post('/login',       login);
router.post('/request-otp', requestOtp);
router.post('/logout',      logout);

// Protected — token required
router.get('/me', requireAuth, me);

module.exports = router;
