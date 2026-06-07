-- ============================================================
--  Resto Manager — MySQL Schema
--  Run: mysql -u root -p < database.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS resto_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE resto_manager;

-- ── Locations ────────────────────────────────────────────────
CREATE TABLE locations (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  address     VARCHAR(255),
  city        VARCHAR(100),
  phone       VARCHAR(20),
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO locations (name, address, city, phone) VALUES
  ('Downtown',  'Connaught Place, Block A', 'New Delhi', '+91-11-2341-0001'),
  ('Midtown',   'Karol Bagh, Main Rd',      'New Delhi', '+91-11-2341-0002'),
  ('Airport',   'IGI Terminal 3, Level 2',  'New Delhi', '+91-11-2341-0003'),
  ('Westside',  'Rajouri Garden, Opp Metro','New Delhi', '+91-11-2341-0004'),
  ('North Gate','Rohini Sector 14',         'New Delhi', '+91-11-2341-0005');

-- ── Categories ───────────────────────────────────────────────
CREATE TABLE categories (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(80) NOT NULL UNIQUE
);

INSERT INTO categories (name) VALUES
  ('Produce'), ('Meat'), ('Dairy'), ('Beverages'), ('Dry Goods'), ('Condiments');

-- ── Inventory Items ──────────────────────────────────────────
CREATE TABLE inventory_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  category_id INT NOT NULL,
  location_id INT NOT NULL,
  quantity    DECIMAL(10,2) DEFAULT 0,
  unit        ENUM('kg','L','pcs','boxes','bottles','g','ml') DEFAULT 'kg',
  unit_price  DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_stock   DECIMAL(10,2) DEFAULT 10,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- ── Inventory Price History ───────────────────────────────────
-- Tracks price changes over time for reporting
CREATE TABLE inventory_price_history (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  item_id      INT NOT NULL,
  old_price    DECIMAL(10,2),
  new_price    DECIMAL(10,2),
  changed_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  changed_by   INT,
  FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
);

-- ── Inventory Transactions ────────────────────────────────────
-- Every stock addition or consumption is logged here
CREATE TABLE inventory_transactions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  item_id       INT NOT NULL,
  location_id   INT NOT NULL,
  type          ENUM('restock', 'consumption', 'adjustment', 'transfer') NOT NULL,
  quantity      DECIMAL(10,2) NOT NULL,
  note          VARCHAR(255),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by    INT,
  FOREIGN KEY (item_id)      REFERENCES inventory_items(id)  ON DELETE CASCADE,
  FOREIGN KEY (location_id)  REFERENCES locations(id)
);

-- ── Employees ────────────────────────────────────────────────
CREATE TABLE employees (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  role        ENUM('Manager','Chef','Sous Chef','Waiter','Cashier','Cleaner','Security') NOT NULL,
  location_id INT NOT NULL,
  phone       VARCHAR(20),
  email       VARCHAR(150),
  hire_date   DATE,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- ── Attendance ───────────────────────────────────────────────
-- One row per employee per day — supports historical queries
CREATE TABLE attendance (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  employee_id  INT NOT NULL,
  location_id  INT NOT NULL,
  date         DATE NOT NULL,
  status       ENUM('Present','Absent','Late','On Leave') NOT NULL DEFAULT 'Present',
  check_in     TIME,
  check_out    TIME,
  note         VARCHAR(255),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_emp_date (employee_id, date),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- ── Users (Auth) ─────────────────────────────────────────────
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(80) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('superadmin','admin','staff') DEFAULT 'staff',
  location_id   INT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id)
);


-- ── Seed Inventory ───────────────────────────────────────────
INSERT INTO inventory_items (name, category_id, location_id, quantity, unit, unit_price, min_stock) VALUES
  ('Chicken Breast',  2, 1,  45,  'kg',  320, 10),
  ('Tomatoes',        1, 1,   8,  'kg',   40, 15),
  ('Whole Milk',      3, 1,  30,  'L',    55, 20),
  ('Basmati Rice',    5, 2, 120,  'kg',   90, 30),
  ('Olive Oil',       6, 2,   6,  'bottles', 450, 10),
  ('Paneer',          3, 2,   4,  'kg',  280,  8),
  ('Mineral Water',   4, 3, 200,  'bottles',  20, 50),
  ('Lamb Chops',      2, 3,  12,  'kg',  890, 15),
  ('Fresh Garlic',    1, 3,   3,  'kg',  120,  5),
  ('Soda Cans',       4, 4, 150,  'pcs',  35, 40),
  ('All-purpose Flour',5, 4, 80,  'kg',   45, 20),
  ('Eggs',            3, 4,   7,  'boxes',180, 10),
  ('Fresh Spinach',   1, 5,   9,  'kg',   60, 12),
  ('Beef Mince',      2, 5,  25,  'kg',  420, 10),
  ('Butter',          3, 5,  18,  'kg',  340,  8);

-- ── Seed Employees ───────────────────────────────────────────
INSERT INTO employees (name, role, location_id, hire_date) VALUES
  ('Arjun Mehra',    'Manager',   1, '2022-03-01'),
  ('Priya Sharma',   'Chef',      1, '2022-05-15'),
  ('Ravi Kumar',     'Waiter',    1, '2023-01-10'),
  ('Deepa Nair',     'Cashier',   1, '2023-06-01'),
  ('Suresh Pillai',  'Chef',      2, '2021-11-20'),
  ('Kavita Singh',   'Manager',   2, '2022-01-05'),
  ('Mohit Verma',    'Waiter',    2, '2023-03-15'),
  ('Asha Iyer',      'Sous Chef', 2, '2022-08-10'),
  ('Rahul Gupta',    'Manager',   3, '2021-07-01'),
  ('Sneha Roy',      'Chef',      3, '2022-09-20'),
  ('Amit Joshi',     'Security',  3, '2023-02-01'),
  ('Leena Kapoor',   'Cashier',   4, '2023-04-10'),
  ('Vijay Bose',     'Manager',   4, '2022-06-15'),
  ('Nandini Das',    'Chef',      4, '2022-10-01'),
  ('Kiran Reddy',    'Manager',   5, '2021-12-01'),
  ('Tanvi Patel',    'Waiter',    5, '2023-07-05'),
  ('Rohit Malhotra', 'Chef',      5, '2022-04-20');

-- ── Useful Views ─────────────────────────────────────────────

-- Current inventory with stock status
CREATE OR REPLACE VIEW v_inventory_status AS
SELECT
  i.id, i.name, c.name AS category, l.name AS location,
  i.quantity, i.unit, i.unit_price,
  ROUND(i.quantity * i.unit_price, 2) AS total_value,
  i.min_stock,
  CASE
    WHEN i.quantity <= i.min_stock * 0.6  THEN 'critical'
    WHEN i.quantity <= i.min_stock * 1.2  THEN 'low'
    ELSE 'ok'
  END AS stock_status
FROM inventory_items i
JOIN categories c ON c.id = i.category_id
JOIN locations  l ON l.id = i.location_id;

-- Monthly attendance summary per employee
CREATE OR REPLACE VIEW v_monthly_attendance AS
SELECT
  e.id AS employee_id, e.name AS employee_name, e.role,
  l.name AS location,
  YEAR(a.date) AS year, MONTH(a.date) AS month,
  COUNT(*) AS total_days,
  SUM(a.status = 'Present') AS present,
  SUM(a.status = 'Absent')  AS absent,
  SUM(a.status = 'Late')    AS late,
  SUM(a.status = 'On Leave') AS on_leave,
  ROUND(SUM(a.status = 'Present') / COUNT(*) * 100, 1) AS attendance_pct
FROM attendance a
JOIN employees e ON e.id = a.employee_id
JOIN locations l  ON l.id = a.location_id
GROUP BY e.id, YEAR(a.date), MONTH(a.date);
