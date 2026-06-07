const router = require('express').Router();
const db     = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/dashboard?location_id=1
router.get('/', async (req, res) => {
  const { location_id } = req.query;
  const locClause = location_id ? 'AND location_id = ?' : '';
  const locParam  = location_id ? [location_id] : [];

  const [[invStats]] = await db.query(`
    SELECT COUNT(*) AS total_items,
           ROUND(SUM(quantity * unit_price), 2) AS total_value,
           SUM(quantity <= min_stock * 1.2 AND quantity > min_stock * 0.6) AS low_count,
           SUM(quantity <= min_stock * 0.6) AS critical_count
    FROM inventory_items WHERE 1=1 ${locClause}`, locParam);

  const [[attStats]] = await db.query(`
    SELECT COUNT(*) AS total_staff,
           SUM(status='Present') AS present,
           SUM(status='Absent')  AS absent,
           SUM(status='Late')    AS late,
           SUM(status='On Leave') AS on_leave
    FROM attendance WHERE date = CURDATE() ${locClause}`, locParam);

  const [lowItems] = await db.query(`
    SELECT i.name, l.name AS location, i.quantity, i.unit, i.min_stock,
           CASE WHEN i.quantity <= i.min_stock * 0.6 THEN 'critical' ELSE 'low' END AS status
    FROM inventory_items i JOIN locations l ON l.id = i.location_id
    WHERE i.quantity <= i.min_stock * 1.2 ${locClause}
    ORDER BY i.quantity / i.min_stock ASC LIMIT 10`, locParam);

  const [locSummary] = await db.query(`
    SELECT l.name, l.id,
           COUNT(DISTINCT i.id) AS items,
           ROUND(SUM(i.quantity * i.unit_price), 2) AS inv_value
    FROM locations l
    LEFT JOIN inventory_items i ON i.location_id = l.id
    GROUP BY l.id ORDER BY l.id`);

  res.json({
    inventory:   invStats,
    attendance:  attStats,
    low_items:   lowItems,
    locations:   locSummary,
  });
});

module.exports = router;
