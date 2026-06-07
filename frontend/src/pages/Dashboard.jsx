import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { dashboardAPI } from '../api';

function fmt(n) { return Number(n || 0).toLocaleString('en-IN'); }

export default function Dashboard() {
  const { selectedLoc } = useOutletContext();
  const [data, setData] = useState(null);

  useEffect(() => {
    const params = selectedLoc !== 'all' ? { location_id: selectedLoc } : {};
    dashboardAPI.summary(params).then(r => setData(r.data));
  }, [selectedLoc]);

  useEffect(() => {
    function onLocChange(e) {
      const loc = e.detail;
      const params = loc !== 'all' ? { location_id: loc } : {};
      dashboardAPI.summary(params).then(r => setData(r.data));
    }
    window.addEventListener('locationChange', onLocChange);
    return () => window.removeEventListener('locationChange', onLocChange);
  }, []);

  if (!data) return <div className="spinner">Loading dashboard…</div>;

  const { inventory: inv, attendance: att, low_items, locations } = data;
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Dashboard</h1>
          <div className="sub">{today}</div>
        </div>
      </div>
      <div className="page">

        <div className="metrics">
          <div className="metric">
            <div className="metric-label">Total Inventory Value</div>
            <div className="metric-val" style={{ color: 'var(--amber-dark)' }}>₹{fmt(inv?.total_value)}</div>
            <div className="metric-sub">{inv?.total_items} items tracked</div>
          </div>
          <div className="metric">
            <div className="metric-label">Low / Critical Stock</div>
            <div className="metric-val" style={{ color: 'var(--coral)' }}>{inv?.low_count || 0} / {inv?.critical_count || 0}</div>
            <div className="metric-sub">items needing attention</div>
          </div>
          <div className="metric">
            <div className="metric-label">Staff Present Today</div>
            <div className="metric-val" style={{ color: 'var(--teal)' }}>{att?.present || 0}</div>
            <div className="metric-sub">of {att?.total_staff || 0} scheduled • {att?.absent || 0} absent • {att?.late || 0} late</div>
          </div>
          <div className="metric">
            <div className="metric-label">Locations Active</div>
            <div className="metric-val">5</div>
            <div className="metric-sub">all branches online</div>
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="card-title">⚠ Stock Alerts</div>
            {low_items?.length ? (
              <table>
                <thead><tr><th>Item</th><th>Location</th><th>Qty</th><th>Status</th></tr></thead>
                <tbody>
                  {low_items.map((item, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{item.name}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{item.location}</td>
                      <td>{item.quantity} {item.unit}</td>
                      <td><span className={`badge badge-${item.status}`}>{item.status === 'critical' ? 'Critical' : 'Low'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>✓ All stock levels healthy</p>}
          </div>

          <div className="card">
            <div className="card-title">📍 Location Summary</div>
            <table>
              <thead><tr><th>Location</th><th>Items</th><th>Inv. Value</th></tr></thead>
              <tbody>
                {locations?.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 500 }}>{l.name}</td>
                    <td>{l.items}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>₹{fmt(l.inv_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
