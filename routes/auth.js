const express = require('express');
const router = express.Router();

const USERS = [
  {
    username: 'gezim',
    password: 'gezim123',
    role: 'admin',
    displayName: 'Gezim'
  },
  {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    role: 'admin',
    displayName: 'Admin'
  },
  {
    username: process.env.USER2_USERNAME || 'punonjës',
    password: process.env.USER2_PASSWORD || 'Staff2025!',
    role: 'viewer',
    displayName: 'Punonjës'
  }
];

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = USERS.find(u => u.username === username && u.password === password);

  if (user) {
    req.session.loggedIn = true;
    req.session.role = user.role;
    req.session.username = user.username;
    req.session.displayName = user.displayName;
    res.json({ ok: true, role: user.role, displayName: user.displayName });
  } else {
    res.status(401).json({ error: 'Kredencialet janë gabim' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  const loggedIn = !!req.session.loggedIn;
  res.json({
    loggedIn,
    role: loggedIn ? (req.session.role || 'admin') : null,
    displayName: req.session.displayName || null
  });
});

module.exports = router;
