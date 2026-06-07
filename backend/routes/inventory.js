const router = require('express').Router();
const db     = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/inventory?location_id=&category_id=&status=low
router.get('/', async (req, res) => {
  const { location_id, category_id, status, search } = req.query;
  let sql = `SELECT * FROM v_inventory_status WHERE 1=1`;
  const params = [];

  if (location_id) { sql += ' AND location_id = ?';  params.push(location_id); }
  // v_inventory_status doesn't expose IDs directly — query underlying table
  // for full flexibility, query inventory_items with joins:
  let query = `
    SELECT i.id, i.name, c.name AS category, c.id AS category_id,
           l.name AS location, l.id AS location_id,
           i.quantity, i.unit, i.unit_price,
           ROUND(i.quantity * i.unit_price, 2) AS total_value,
           i.min_stock, i.updated_at,
           CASE
             WHEN i.quantity <= i.min_stock * 0.6  THEN 'critical'
             WHEN i.quantity <= i.min_stock * 1.2  THEN 'low'
             ELSE 'ok'
           END AS stock_status
    FROM inventory_items i
    JOIN categories c ON c.id = i.category_id
    JOIN locations  l ON l.id = i.location_id
    WHERE 1=1
  `;
  const qParams = [];

  if (location_id)  { query += ' AND i.location_id = ?';  qParams.push(location_id); }
  if (category_id)  { query += ' AND i.category_id = ?';  qParams.push(category_id); }
  if (search)       { query += ' AND i.name LIKE ?';       qParams.push(`%${search}%`); }
  if (status === 'low')      query += ' AND i.quantity <= i.min_stock * 1.2';
  if (status === 'critical') query += ' AND i.quantity <= i.min_stock * 0.6';

  query += ' ORDER BY l.id, c.name, i.name';
  const [rows] = await db.query(query, qParams);
  res.json(rows);
});

// GET /api/inventory/categories
router.get('/categories', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM categories ORDER BY name');
  res.json(rows);
});

// GET /api/inventory/:id
router.get('/:id', async (req, res) => {
  const [rows] = await db.query(
    `SELECT i.*, c.name AS category, l.name AS location
     FROM inventory_items i
     JOIN categories c ON c.id = i.category_id
     JOIN locations  l ON l.id = i.location_id
     WHERE i.id = ?`, [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// POST /api/inventory
router.post('/', async (req, res) => {
  const { name, category_id, location_id, quantity, unit, unit_price, min_stock } = req.body;
  if (!name || !category_id || !location_id)
    return res.status(400).json({ error: 'name, category_id, location_id required' });

  const [result] = await db.query(
    `INSERT INTO inventory_items (name, category_id, location_id, quantity, unit, unit_price, min_stock)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, category_id, location_id, quantity || 0, unit || 'kg', unit_price || 0, min_stock || 10]
  );
  res.status(201).json({ id: result.insertId });
});

// PUT /api/inventory/:id
router.put('/:id', async (req, res) => {
  const { name, category_id, location_id, quantity, unit, unit_price, min_stock } = req.body;
  const { id } = req.params;

  // Log price change if price changed
  const [[old]] = await db.query('SELECT unit_price FROM inventory_items WHERE id = ?', [id]);
  if (old && unit_price && parseFloat(old.unit_price) !== parseFloat(unit_price)) {
    await db.query(
      'INSERT INTO inventory_price_history (item_id, old_price, new_price, changed_by) VALUES (?,?,?,?)',
      [id, old.unit_price, unit_price, req.user.id]
    );
  }

  await db.query(
    `UPDATE inventory_items SET name=?, category_id=?, location_id=?, quantity=?, unit=?, unit_price=?, min_stock=?
     WHERE id=?`,
    [name, category_id, location_id, quantity, unit, unit_price, min_stock, id]
  );
  res.json({ success: true });
});

// DELETE /api/inventory/:id  (admin only)
router.delete('/:id', requireRole('admin', 'superadmin'), async (req, res) => {
  await db.query('DELETE FROM inventory_items WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// POST /api/inventory/:id/transaction  — restock / consumption / adjustment
router.post('/:id/transaction', async (req, res) => {
  const { type, quantity, note } = req.body;
  const { id } = req.params;

  const [[item]] = await db.query('SELECT * FROM inventory_items WHERE id = ?', [id]);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  let newQty = parseFloat(item.quantity);
  if (type === 'restock')    newQty += parseFloat(quantity);
  if (type === 'consumption') newQty -= parseFloat(quantity);
  if (type === 'adjustment') newQty  = parseFloat(quantity);
  if (newQty < 0) newQty = 0;

  await db.query('UPDATE inventory_items SET quantity = ? WHERE id = ?', [newQty, id]);
  await db.query(
    `INSERT INTO inventory_transactions (item_id, location_id, type, quantity, note, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, item.location_id, type, quantity, note || null, req.user.id]
  );
  res.json({ success: true, new_quantity: newQty });
});

// GET /api/inventory/:id/history — price + transaction history
router.get('/:id/history', async (req, res) => {
  const { id } = req.params;
  const [prices] = await db.query(
    'SELECT * FROM inventory_price_history WHERE item_id = ? ORDER BY changed_at DESC LIMIT 30', [id]
  );
  const [transactions] = await db.query(
    'SELECT * FROM inventory_transactions WHERE item_id = ? ORDER BY created_at DESC LIMIT 50', [id]
  );
  res.json({ prices, transactions });
});

// GET /api/inventory/report/monthly?year=2025&month=5&location_id=1
router.get('/report/monthly', async (req, res) => {
  const { year, month, location_id } = req.query;
  let query = `
    SELECT l.name AS location, c.name AS category,
           SUM(i.quantity * i.unit_price) AS total_value,
           SUM(i.quantity) AS total_qty,
           COUNT(*) AS item_count
    FROM inventory_items i
    JOIN categories c ON c.id = i.category_id
    JOIN locations  l ON l.id = i.location_id
    WHERE 1=1
  `;
  const params = [];
  if (location_id) { query += ' AND i.location_id = ?'; params.push(location_id); }
  query += ' GROUP BY l.id, c.id ORDER BY l.name, c.name';
  const [rows] = await db.query(query, params);
  res.json(rows);
});

module.exports = router;
