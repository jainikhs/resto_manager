# 🍽 Resto Manager — Full Stack Restaurant Management System

Multi-location inventory + employee attendance tracker.  
**Stack:** React (Vite) → Nginx → Express (Node.js) → MySQL 8

---

## Project Structure

```
resto-manager/
├── docker-compose.yml          # Orchestrates all 3 containers
├── .env.example                # Copy to .env and fill secrets
├── database.sql                # MySQL schema + seed data
│
├── backend/                    # Node.js / Express API
│   ├── Dockerfile
│   ├── server.js               # Entry point
│   ├── package.json
│   ├── .env.example
│   ├── config/
│   │   └── db.js               # MySQL connection pool
│   ├── middleware/
│   │   └── auth.js             # JWT middleware
│   └── routes/
│       ├── auth.js             # POST /api/auth/login|register
│       ├── locations.js        # GET  /api/locations
│       ├── inventory.js        # CRUD /api/inventory
│       ├── employees.js        # CRUD /api/employees
│       ├── attendance.js       # CRUD /api/attendance
│       └── dashboard.js        # GET  /api/dashboard
│
└── frontend/                   # React + Vite
    ├── Dockerfile
    ├── nginx.conf              # Reverse-proxy + SPA fallback
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx            # Router setup
        ├── index.css           # Global styles
        ├── api/
        │   └── index.js        # Axios client + API helpers
        ├── components/
        │   └── Layout.jsx      # Sidebar + outlet
        └── pages/
            ├── Login.jsx
            ├── Dashboard.jsx
            ├── Inventory.jsx
            ├── Attendance.jsx
            ├── Employees.jsx
            ├── Locations.jsx
            └── Reports.jsx
```

---

## Quick Start (Docker — Recommended)

### 1. Prerequisites
- Docker ≥ 24 and Docker Compose v2 installed on your server

### 2. Clone / copy the project
```bash
scp -r resto-manager/ user@your-server:/opt/resto-manager
ssh user@your-server
cd /opt/resto-manager
```

### 3. Set environment variables
```bash
cp .env.example .env
nano .env          # Set strong passwords and a 32+ char JWT_SECRET
```

### 4. Build and start all containers
```bash
docker compose up -d --build
```

This will:
- Start **MySQL 8** and auto-import `database.sql` (schema + seed data)
- Start the **Express backend** on internal port 4000
- Build the React app and serve it via **Nginx on port 80**

### 5. Open the app
Navigate to `http://your-server-ip` in your browser.

**Default login:** `admin` / `admin123`  
⚠️ Change this immediately via the `/api/auth/register` endpoint.

---

## Useful Docker Commands

```bash
# View running containers
docker compose ps

# View backend logs
docker compose logs -f backend

# View DB logs
docker compose logs -f db

# Stop everything
docker compose down

# Stop and delete database volume (full reset)
docker compose down -v

# Rebuild after code changes
docker compose up -d --build backend
docker compose up -d --build frontend
```

---

## Manual Setup (Without Docker)

### Backend
```bash
cd backend
cp .env.example .env       # Fill in your MySQL credentials
npm install
node server.js             # or: npm run dev (with nodemon)
```

### Frontend
```bash
cd frontend
npm install
npm run dev                # Dev server at http://localhost:5173
npm run build              # Production build → dist/
```

### Database
```bash
mysql -u root -p < database.sql
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/dashboard` | Summary metrics |
| GET | `/api/locations` | All 5 locations |
| GET | `/api/inventory` | Items (filterable) |
| POST | `/api/inventory` | Add item |
| PUT | `/api/inventory/:id` | Update item |
| POST | `/api/inventory/:id/transaction` | Restock / consume |
| GET | `/api/employees` | All employees |
| POST | `/api/employees` | Add employee |
| GET | `/api/attendance/today-with-employees` | Today's attendance |
| POST | `/api/attendance` | Mark attendance |
| POST | `/api/attendance/bulk` | Bulk mark |
| GET | `/api/attendance/monthly` | Monthly report |
| GET | `/api/attendance/report/summary` | Yearly summary |

All endpoints except `/api/auth/login` require `Authorization: Bearer <token>`.

---

## Production Checklist

- [ ] Change default admin password
- [ ] Set a strong `JWT_SECRET` (≥ 32 chars)
- [ ] Set strong MySQL passwords in `.env`
- [ ] Remove `ports: 3306` from docker-compose.yml (don't expose DB externally)
- [ ] Set up SSL/TLS (use Certbot + Let's Encrypt in front of Nginx)
- [ ] Set up automated MySQL backups (`mysqldump` via cron)
- [ ] Point a domain name to your server IP
