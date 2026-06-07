require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/locations',  require('./routes/locations'));
app.use('/api/inventory',  require('./routes/inventory'));
app.use('/api/employees',  require('./routes/employees'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/dashboard',  require('./routes/dashboard'));

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: new Date() }));

// ── Serve React build in production ──────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (_, res) =>
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'))
  );
}

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', detail: err.message });
});

const PORT = process.env.PORT || 4000;

async function start() {
  // Wait for DB then seed admin if needed
  const db = require('./config/db');
  let retries = 20;
  while (retries > 0) {
    try {
      await db.query('SELECT 1');
      console.log('✅  Database connected');
      break;
    } catch (e) {
      retries--;
      console.log(`⏳  Waiting for database... (${retries} retries left)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  if (retries === 0) {
    console.error('❌  Could not connect to database. Exiting.');
    process.exit(1);
  }

  // Auto-seed default admin user
  try {
    const seedAdmin = require('./scripts/seed-admin');
    await seedAdmin();
  } catch (e) {
    console.warn('⚠️  Seed skipped:', e.message);
  }

  app.listen(PORT, () =>
    console.log(`✅  Resto Manager API running on port ${PORT}`)
  );
}

start();
