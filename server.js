const express = require('express');
const session = require('express-session');
const bcrypt  = require('bcryptjs');
const path    = require('path');
require('dotenv').config();

const app = express();

/* ── Middleware ─────────────────────────────────── */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-me-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,                                    // JS cannot read cookie
    secure: process.env.NODE_ENV === 'production',     // HTTPS only in prod
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,                       // 8h session
  },
}));

/* ── Admin password (bcrypt hash) ───────────────── */
// Default = "admin123" — override with ADMIN_PASSWORD_HASH env var on Render
const ADMIN_HASH = process.env.ADMIN_PASSWORD_HASH
  || '$2b$12$lr1aH5AOZzR/0AkjZXSgBOnd61GWz7VMgGZq.ck0iUaSNIp5KMs0a';

/* ── Rate limiting (simple in-memory) ──────────── */
const loginAttempts = new Map(); // ip → { count, lockedUntil }
const MAX_ATTEMPTS  = 5;
const LOCK_DURATION = 15 * 60 * 1000; // 15 min

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  if (entry.lockedUntil > now) {
    const mins = Math.ceil((entry.lockedUntil - now) / 60000);
    return { blocked: true, mins };
  }
  return { blocked: false, entry };
}

function recordFailedAttempt(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCK_DURATION;
    entry.count = 0;
  }
  loginAttempts.set(ip, entry);
}

function clearAttempts(ip) {
  loginAttempts.delete(ip);
}

/* ── Auth guard ─────────────────────────────────── */
function requireAdmin(req, res, next) {
  if (req.session?.isAdmin) return next();
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
}

/* ── Routes ─────────────────────────────────────── */

// Public app
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Block direct URL access to raw HTML files in public/
app.get('/admin.html',       (_req, res) => res.redirect('/admin'));
app.get('/admin-login.html', (_req, res) => res.redirect('/admin'));

// Admin login page (GET) — served by requireAdmin if no session
app.get('/admin', requireAdmin, (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Login API
app.post('/admin/login', async (req, res) => {
  const ip = req.ip;

  // Rate limit check
  const rl = checkRateLimit(ip);
  if (rl.blocked) {
    return res.status(429).json({ error: `Too many attempts. Try again in ${rl.mins} min.` });
  }

  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });

  // Always hash-compare to prevent timing attacks
  const ok = await bcrypt.compare(password, ADMIN_HASH);
  if (!ok) {
    recordFailedAttempt(ip);
    await new Promise(r => setTimeout(r, 600)); // fixed delay
    return res.status(401).json({ error: 'Invalid password' });
  }

  clearAttempts(ip);
  req.session.isAdmin = true;
  req.session.loginAt = Date.now();
  res.json({ ok: true });
});

// Logout API
app.post('/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// Session status (admin dashboard polls this)
app.get('/admin/session', requireAdmin, (_req, res) => {
  res.json({ ok: true });
});

// Serve other public static assets (CSS, JS if any) — after route definitions
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// 404
app.use((_req, res) => res.status(404).send('Not found'));

/* ── Start ──────────────────────────────────────── */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ CryptoBet running → http://localhost:${PORT}`);
  console.log(`🔐 Admin panel      → http://localhost:${PORT}/admin`);
  if (!process.env.ADMIN_PASSWORD_HASH) {
    console.warn('⚠  ADMIN_PASSWORD_HASH not set — using default password "admin123". Change it!');
  }
});
