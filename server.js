require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24h
}));

// Auth middleware for API routes
function requireAuth(req, res, next) {
  if (req.session && req.session.loggedIn) return next();
  res.status(401).json({ error: 'Jo i autorizuar' });
}

// Write middleware — only admin can create/update/delete
function requireAdmin(req, res, next) {
  if (req.method === 'GET') return next();
  const role = req.session.role || 'admin'; // default admin for old sessions
  if (req.session && req.session.loggedIn && role === 'admin') return next();
  res.status(403).json({ error: 'Nuk keni leje për këtë veprim' });
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/workers', requireAuth, requireAdmin, require('./routes/workers'));
app.use('/api/locations', requireAuth, requireAdmin, require('./routes/locations'));
app.use('/api/shifts', requireAuth, requireAdmin, require('./routes/shifts'));
app.use('/api/reports', requireAuth, require('./routes/reports'));

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Staff Manager running on port ${PORT}`);
});
