/**
 * seed-admin.js
 * Run once after DB is up to create the default admin user.
 * Called automatically by server.js on startup if no users exist.
 *
 * Manual run:  node scripts/seed-admin.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const db     = require('../config/db');

async function seedAdmin() {
  try {
    const [rows] = await db.query('SELECT COUNT(*) AS cnt FROM users');
    if (rows[0].cnt > 0) {
      console.log('ℹ️  Users already exist — skipping admin seed.');
      return;
    }

    const hash = bcrypt.hashSync('admin123', 10);
    await db.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      ['admin', hash, 'superadmin']
    );
    console.log('✅  Default admin user created: admin / admin123');
    console.log('⚠️   Please change this password immediately after first login!');
  } catch (err) {
    console.error('❌  Failed to seed admin:', err.message);
  }
}

// If run directly
if (require.main === module) {
  seedAdmin().then(() => process.exit(0));
}

module.exports = seedAdmin;
