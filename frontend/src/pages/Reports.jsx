import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { attendanceAPI, inventoryAPI } from '../api';

export default function Reports() {
  const { selectedLoc } = useOutletContext();
  const [tab, setTab] = useState('attendance');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [attData, setAttData] = useState([]);
  const [invData, setInvData] = useState([]);

  useEffect(() => {
    const loc = selectedLoc !== 'all' ? { location_id: selectedLoc } : {};
    attendanceAPI.monthly({ year, month, ...loc }).then(r => setAttData(r.data));
    inventoryAPI.monthlyReport({ year, month, ...loc }).then(r => setInvData(r.data));
  }, [year, month, selectedLoc]);

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div>
      <div className="topbar">
        <div><h1>Reports</h1><div className="sub">Monthly attendance & inventory summaries</div></div>
        <div className="toolbar">
          <select className="form-control" value={month} onChange={e => setMonth(e.target.value)}>
            {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select className="form-control" value={year} onChange={e => setYear(e.target.value)}>
            {[2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>
      <div className="page">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['attendance', 'inventory'].map(t => (
            <button key={t} className={`btn${tab === t ? ' btn-primary' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)} Report
            </button>
          ))}
        </div>

        {tab === 'attendance' && (
          <div className="card" style={{ padding: 0 }}>
            <table>
              <thead>
                <tr><th>Employee</th><th>Role</th><th>Location</th><th>Present</th><th>Absent</th><th>Late</th><th>On Leave</th><th>Attendance %</th></tr>
              </thead>
              <tbody>
                {attData.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{r.employee_name}</td>
                    <td>{r.role}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{r.location}</td>
                    <td style={{ color: 'var(--teal)' }}>{r.present}</td>
                    <td style={{ color: 'var(--coral)' }}>{r.absent}</td>
                    <td style={{ color: 'var(--amber-dark)' }}>{r.late}</td>
                    <td>{r.on_leave}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: r.attendance_pct >= 90 ? 'var(--teal)' : r.attendance_pct >= 75 ? 'var(--amber-dark)' : 'var(--coral)' }}>
                        {r.attendance_pct}%
                      </span>
                    </td>
                  </tr>
                ))}
                {!attData.length && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No attendance data for this period</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'inventory' && (
          <div className="card" style={{ padding: 0 }}>
            <table>
              <thead>
                <tr><th>Location</th><th>Category</th><th>Items</th><th>Total Qty</th><th>Total Value</th></tr>
              </thead>
              <tbody>
                {invData.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{r.location}</td>
                    <td><span style={{ fontSize: 11, background: 'var(--gray-100)', padding: '2px 8px', borderRadius: 20 }}>{r.category}</span></td>
                    <td>{r.item_count}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{Number(r.total_qty).toFixed(1)}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600 }}>₹{Number(r.total_value).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {!invData.length && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No inventory data</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
