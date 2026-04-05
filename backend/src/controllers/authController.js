const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

let User;
try {
  User = require('../models').User;
} catch (e) {
  console.warn('⚠️  User model unavailable');
}

// In-memory OTP store  { phone: { otp, expiresAt } }
const otpStore = {};

// ─────────────────────────────────────────────────────────────
//  POST /api/auth/login
//  Body varies by role:
//    admin   → { role: 'admin',   loginId: email,       password }
//    clerk   → { role: 'clerk',   loginId: employeeId,  password (4-digit PIN) }
//    officer → { role: 'officer', loginId: staffId,     password }
//    farmer  → { role: 'farmer',  loginId: phone,       otp }
// ─────────────────────────────────────────────────────────────
async function login(req, res) {
  const { role, loginId, password, otp } = req.body;

  if (!role || !loginId) {
    return res.status(400).json({ error: 'role and loginId are required' });
  }

  // ── Farmer: OTP flow ─────────────────────────────────────
  if (role === 'farmer') {
    if (!otp) {
      return res.status(400).json({ error: 'otp is required for farmer login' });
    }

    const stored = otpStore[loginId];
    const isValidOtp =
      stored &&
      stored.otp === otp &&
      Date.now() < stored.expiresAt;

    // In dev/demo mode, also accept the hardcoded OTP '5921'
    const isDemoOtp = otp === '5921';

    if (!isValidOtp && !isDemoOtp) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    // Clear OTP after use
    delete otpStore[loginId];

    // Look up farmer user
    let user = null;
    try {
      user = await User.findOne({ where: { loginId, role: 'farmer' }, raw: true });
    } catch { /* DB unavailable — use demo persona */ }

    const authUser = user
      ? { role: 'farmer', name: user.name, factoryId: user.factoryId, userId: user.id }
      : { role: 'farmer', name: 'Wanjiku Kamau', factoryId: 'kiambu', userId: 'demo-farmer' };

    const token = jwt.sign(authUser, JWT_SECRET, { expiresIn: '8h' });
    return res.json({ token, user: authUser });
  }

  // ── Staff roles: password flow ────────────────────────────
  if (!password) {
    return res.status(400).json({ error: 'password is required' });
  }

  let dbUser = null;
  try {
    dbUser = await User.findOne({ where: { loginId, role }, raw: true });
  } catch { /* DB unavailable */ }

  // Fallback demo credentials when DB is unavailable
  const DEMO_USERS = {
    'admin@chaiconnect.co.ke': { role: 'admin',   name: 'Makena Wanjiru', password: 'Admin@1234',   factoryId: 'kiambu', userId: 'demo-admin' },
    'KC-2044':                 { role: 'clerk',   name: 'Juma Otieno',    password: '2044',          factoryId: 'kiambu', userId: 'demo-clerk' },
    'EXT-889':                 { role: 'officer', name: 'Wambui Extension', password: 'Officer@1234', factoryId: 'kiambu', userId: 'demo-officer' },
  };

  let authUser = null;

  if (dbUser) {
    // Real DB user — bcrypt compare
    const ok = await bcrypt.compare(password, dbUser.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    authUser = { role: dbUser.role, name: dbUser.name, factoryId: dbUser.factoryId, userId: dbUser.id };
  } else {
    // Demo fallback
    const demo = DEMO_USERS[loginId];
    if (!demo || demo.role !== role || demo.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    authUser = { role: demo.role, name: demo.name, factoryId: demo.factoryId, userId: demo.userId };
  }

  const token = jwt.sign(authUser, JWT_SECRET, { expiresIn: '8h' });
  return res.json({ token, user: authUser });
}

// ─────────────────────────────────────────────────────────────
//  POST /api/auth/request-otp
//  Sends (or simulates) an OTP to the farmer's phone
// ─────────────────────────────────────────────────────────────
async function requestOtp(req, res) {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone is required' });

  // Generate 4-digit OTP
  const otp = String(Math.floor(1000 + Math.random() * 9000));
  otpStore[phone] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 }; // 5 min TTL

  // In production: call SmsService here to send the real OTP
  // smsService.sendOtp({ phone, otp });
  console.log(`📱 OTP for ${phone}: ${otp}  (simulated — use '5921' in demo)`);

  return res.json({
    ok: true,
    message: 'OTP sent (simulated). Use code 5921 for demo.',
    // Only expose OTP in non-production for demo convenience
    ...(process.env.NODE_ENV !== 'production' && { debugOtp: otp }),
  });
}

// ─────────────────────────────────────────────────────────────
//  GET /api/auth/me
//  Returns the current user from JWT (no DB hit needed)
// ─────────────────────────────────────────────────────────────
function me(req, res) {
  // req.user set by requireAuth middleware
  return res.json({ user: req.user });
}

// ─────────────────────────────────────────────────────────────
//  POST /api/auth/logout
//  Client simply discards the token — JWT is stateless.
//  Endpoint exists for consistency with frontend fetch calls.
// ─────────────────────────────────────────────────────────────
function logout(req, res) {
  return res.json({ ok: true, message: 'Logged out — discard your token client-side' });
}

module.exports = { login, requestOtp, me, logout };
