const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../config/db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'username and password required' });

  const [rows] = await db.query(
    'SELECT * FROM users WHERE username = ?', [username]
  );
  if (!rows.length)
    return res.status(401).json({ error: 'Invalid credentials' });

  const user = rows[0];
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match)
    return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, location_id: user.location_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.json({ token, user: { id: user.id, username: user.username, role: user.role, location_id: user.location_id } });
});

// POST /api/auth/register  (superadmin only in production — remove or guard appropriately)
router.post('/register', async (req, res) => {
  const { username, password, role, location_id } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'username and password required' });

  const hash = await bcrypt.hash(password, 10);
  const [result] = await db.query(
    'INSERT INTO users (username, password_hash, role, location_id) VALUES (?, ?, ?, ?)',
    [username, hash, role || 'staff', location_id || null]
  );
  res.status(201).json({ id: result.insertId, username, role: role || 'staff' });
});

module.exports = router;
