const router = require('express').Router();
const db     = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/locations
router.get('/', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM locations WHERE is_active = 1 ORDER BY id');
  res.json(rows);
});

// GET /api/locations/:id/summary
router.get('/:id/summary', async (req, res) => {
  const { id } = req.params;
  const [[loc]] = await db.query('SELECT * FROM locations WHERE id = ?', [id]);
  if (!loc) return res.status(404).json({ error: 'Not found' });

  const [[inv]] = await db.query(
    `SELECT COUNT(*) AS items, ROUND(SUM(quantity * unit_price),2) AS total_value,
            SUM(quantity <= min_stock * 1.2) AS low_stock
     FROM inventory_items WHERE location_id = ?`, [id]
  );
  const [[att]] = await db.query(
    `SELECT COUNT(*) AS total,
            SUM(status='Present') AS present,
            SUM(status='Absent')  AS absent,
            SUM(status='Late')    AS late
     FROM attendance WHERE location_id = ? AND date = CURDATE()`, [id]
  );
  res.json({ ...loc, inventory: inv, today_attendance: att });
});

module.exports = router;
