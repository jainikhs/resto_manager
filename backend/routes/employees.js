const router = require('express').Router();
const db     = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/employees?location_id=&role=
router.get('/', async (req, res) => {
  const { location_id, role } = req.query;
  let query = `
    SELECT e.*, l.name AS location_name
    FROM employees e
    JOIN locations l ON l.id = e.location_id
    WHERE e.is_active = 1
  `;
  const params = [];
  if (location_id) { query += ' AND e.location_id = ?'; params.push(location_id); }
  if (role)        { query += ' AND e.role = ?';        params.push(role); }
  query += ' ORDER BY l.id, e.name';
  const [rows] = await db.query(query, params);
  res.json(rows);
});

// GET /api/employees/:id
router.get('/:id', async (req, res) => {
  const [[emp]] = await db.query(
    `SELECT e.*, l.name AS location_name FROM employees e
     JOIN locations l ON l.id = e.location_id WHERE e.id = ?`, [req.params.id]
  );
  if (!emp) return res.status(404).json({ error: 'Not found' });
  res.json(emp);
});

// POST /api/employees
router.post('/', requireRole('admin', 'superadmin'), async (req, res) => {
  const { name, role, location_id, phone, email, hire_date } = req.body;
  if (!name || !role || !location_id)
    return res.status(400).json({ error: 'name, role, location_id required' });

  const [result] = await db.query(
    'INSERT INTO employees (name, role, location_id, phone, email, hire_date) VALUES (?,?,?,?,?,?)',
    [name, role, location_id, phone || null, email || null, hire_date || null]
  );
  res.status(201).json({ id: result.insertId });
});

// PUT /api/employees/:id
router.put('/:id', requireRole('admin', 'superadmin'), async (req, res) => {
  const { name, role, location_id, phone, email, hire_date, is_active } = req.body;
  await db.query(
    `UPDATE employees SET name=?, role=?, location_id=?, phone=?, email=?, hire_date=?, is_active=?
     WHERE id=?`,
    [name, role, location_id, phone, email, hire_date, is_active ?? 1, req.params.id]
  );
  res.json({ success: true });
});

// DELETE /api/employees/:id  — soft delete
router.delete('/:id', requireRole('admin', 'superadmin'), async (req, res) => {
  await db.query('UPDATE employees SET is_active = 0 WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
