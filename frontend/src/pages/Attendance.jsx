import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { attendanceAPI } from '../api';

const STATUSES = ['Present', 'Late', 'Absent', 'On Leave'];
const AVATAR_COLORS = [
  { bg: '#E1F5EE', color: '#0F6E56' }, { bg: '#EEEDFE', color: '#534AB7' },
  { bg: '#FAECE7', color: '#993C1D' }, { bg: '#FAEEDA', color: '#854F0B' },
  { bg: '#E6F1FB', color: '#185FA5' },
];

function initials(name) { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }

export default function Attendance() {
  const { selectedLoc } = useOutletContext();
  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState({});

  const load = useCallback(() => {
    const params = { date, ...(selectedLoc !== 'all' && { location_id: selectedLoc }) };
    attendanceAPI.todayWithEmps(params).then(r => setStaff(r.data));
  }, [selectedLoc, date]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    window.addEventListener('locationChange', load);
    return () => window.removeEventListener('locationChange', load);
  }, [load]);

  async function markStatus(empId, status) {
    setSaving(s => ({ ...s, [empId]: true }));
    await attendanceAPI.mark({ employee_id: empId, date, status });
    setStaff(prev => prev.map(e => e.employee_id === empId ? { ...e, status } : e));
    setSaving(s => ({ ...s, [empId]: false }));
  }

  const visible = staff.filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()));
  const summary = STATUSES.reduce((acc, s) => ({ ...acc, [s]: staff.filter(e => e.status === s).length }), {});

  return (
    <div>
      <div className="topbar">
        <div><h1>Attendance</h1><div className="sub">{staff.length} employees · {summary.Present} present, {summary.Absent} absent</div></div>
        <div className="toolbar">
          <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} style={{ width: 160 }} />
        </div>
      </div>
      <div className="page">

        {/* Summary bar */}
        <div className="metrics" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
          {STATUSES.map(s => (
            <div key={s} className="metric">
              <div className="metric-label">{s}</div>
              <div className="metric-val">{summary[s] || 0}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 14 }}>
          <input className="form-control" style={{ width: 240 }} placeholder="Search employees…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="att-grid">
          {visible.map(emp => {
            const ac = AVATAR_COLORS[(emp.location_id - 1) % 5];
            return (
              <div key={emp.employee_id} className="att-card">
                <div className="avatar" style={{ background: ac.bg, color: ac.color }}>{initials(emp.name)}</div>
                <div className="att-name">{emp.name}</div>
                <div className="att-role">{emp.role} · {emp.location_name}</div>
                <span className={`badge badge-${emp.status}`}>{emp.status}</span>
                <div className="status-btns">
                  {STATUSES.map(s => (
                    <button key={s}
                      className={`status-btn${emp.status === s ? ` active-${s === 'On Leave' ? 'Leave' : s}` : ''}`}
                      disabled={saving[emp.employee_id]}
                      onClick={() => markStatus(emp.employee_id, s)}>
                      {s === 'On Leave' ? 'Leave' : s}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {!visible.length && <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>No employees found</p>}
        </div>
      </div>
    </div>
  );
}
