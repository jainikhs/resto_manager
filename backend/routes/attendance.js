const router = require('express').Router();
const db     = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/attendance?date=2025-05-24&location_id=1
router.get('/', async (req, res) => {
  const { date, location_id } = req.query;
  const targetDate = date || new Date().toISOString().slice(0, 10);

  let query = `
    SELECT a.*, e.name AS employee_name, e.role, l.name AS location_name
    FROM attendance a
    JOIN employees e ON e.id = a.employee_id
    JOIN locations l ON l.id = a.location_id
    WHERE a.date = ?
  `;
  const params = [targetDate];
  if (location_id) { query += ' AND a.location_id = ?'; params.push(location_id); }
  query += ' ORDER BY l.id, e.name';

  const [rows] = await db.query(query, params);
  res.json(rows);
});

// GET /api/attendance/today-with-employees?location_id=1
// Returns all employees merged with today's attendance (absent if no record)
router.get('/today-with-employees', async (req, res) => {
  const { location_id } = req.query;
  const today = new Date().toISOString().slice(0, 10);

  let query = `
    SELECT e.id AS employee_id, e.name, e.role, e.location_id,
           l.name AS location_name,
           COALESCE(a.status, 'Absent') AS status,
           a.check_in, a.check_out, a.note, a.id AS attendance_id
    FROM employees e
    JOIN locations l ON l.id = e.location_id
    LEFT JOIN attendance a ON a.employee_id = e.id AND a.date = ?
    WHERE e.is_active = 1
  `;
  const params = [today];
  if (location_id) { query += ' AND e.location_id = ?'; params.push(location_id); }
  query += ' ORDER BY l.id, e.name';

  const [rows] = await db.query(query, params);
  res.json(rows);
});

// POST /api/attendance  — mark or update attendance for a day
router.post('/', async (req, res) => {
  const { employee_id, date, status, check_in, check_out, note } = req.body;
  if (!employee_id || !status)
    return res.status(400).json({ error: 'employee_id and status required' });

  const [[emp]] = await db.query('SELECT location_id FROM employees WHERE id = ?', [employee_id]);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });

  const targetDate = date || new Date().toISOString().slice(0, 10);

  // Upsert — update if record exists for that date
  await db.query(`
    INSERT INTO attendance (employee_id, location_id, date, status, check_in, check_out, note)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE status=VALUES(status), check_in=VALUES(check_in),
      check_out=VALUES(check_out), note=VALUES(note)
  `, [employee_id, emp.location_id, targetDate, status, check_in || null, check_out || null, note || null]);

  res.json({ success: true });
});

// POST /api/attendance/bulk  — mark attendance for multiple employees at once
router.post('/bulk', async (req, res) => {
  const { records, date } = req.body; // records: [{employee_id, status, check_in, check_out}]
  if (!Array.isArray(records) || !records.length)
    return res.status(400).json({ error: 'records array required' });

  const targetDate = date || new Date().toISOString().slice(0, 10);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    for (const r of records) {
      const [[emp]] = await conn.query('SELECT location_id FROM employees WHERE id = ?', [r.employee_id]);
      if (!emp) continue;
      await conn.query(`
        INSERT INTO attendance (employee_id, location_id, date, status, check_in, check_out)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE status=VALUES(status), check_in=VALUES(check_in), check_out=VALUES(check_out)
      `, [r.employee_id, emp.location_id, targetDate, r.status, r.check_in || null, r.check_out || null]);
    }
    await conn.commit();
    res.json({ success: true, count: records.length });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// GET /api/attendance/monthly?year=2025&month=5&location_id=1&employee_id=3
router.get('/monthly', async (req, res) => {
  const { year, month, location_id, employee_id } = req.query;
  let query = `SELECT * FROM v_monthly_attendance WHERE 1=1`;
  const params = [];
  if (year)        { query += ' AND year = ?';        params.push(year); }
  if (month)       { query += ' AND month = ?';       params.push(month); }
  if (location_id) { query += ' AND location_id = ?'; params.push(location_id); }
  if (employee_id) { query += ' AND employee_id = ?'; params.push(employee_id); }
  query += ' ORDER BY year DESC, month DESC, location, employee_name';
  const [rows] = await db.query(query, params);
  res.json(rows);
});

// GET /api/attendance/calendar/:employee_id?year=2025&month=5
router.get('/calendar/:employee_id', async (req, res) => {
  const { employee_id } = req.params;
  const { year, month } = req.query;
  const y = year  || new Date().getFullYear();
  const m = month || new Date().getMonth() + 1;

  const [rows] = await db.query(
    `SELECT date, status, check_in, check_out
     FROM attendance
     WHERE employee_id = ? AND YEAR(date) = ? AND MONTH(date) = ?
     ORDER BY date`,
    [employee_id, y, m]
  );
  res.json(rows);
});

// GET /api/attendance/report/summary?year=2025&location_id=1
router.get('/report/summary', async (req, res) => {
  const { year, location_id } = req.query;
  const y = year || new Date().getFullYear();
  let query = `
    SELECT l.name AS location, e.name AS employee, e.role,
           MONTH(a.date) AS month,
           SUM(a.status='Present') AS present,
           SUM(a.status='Absent')  AS absent,
           SUM(a.status='Late')    AS late,
           SUM(a.status='On Leave') AS on_leave,
           COUNT(*) AS total_records
    FROM attendance a
    JOIN employees e ON e.id = a.employee_id
    JOIN locations l ON l.id = a.location_id
    WHERE YEAR(a.date) = ?
  `;
  const params = [y];
  if (location_id) { query += ' AND a.location_id = ?'; params.push(location_id); }
  query += ' GROUP BY a.employee_id, MONTH(a.date) ORDER BY l.name, e.name, month';
  const [rows] = await db.query(query, params);
  res.json(rows);
});

module.exports = router;
