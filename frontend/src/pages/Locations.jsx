// Locations.jsx
import { useState, useEffect } from 'react';
import { locationAPI } from '../api';

export function Locations() {
  const [locs, setLocs] = useState([]);
  const [summaries, setSummaries] = useState({});

  useEffect(() => {
    locationAPI.list().then(async ({ data }) => {
      setLocs(data);
      const sums = {};
      await Promise.all(data.map(async l => {
        const { data: s } = await locationAPI.summary(l.id);
        sums[l.id] = s;
      }));
      setSummaries(sums);
    });
  }, []);

  return (
    <div>
      <div className="topbar"><div><h1>Locations</h1><div className="sub">5 active branches</div></div></div>
      <div className="page">
        <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))' }}>
          {locs.map(l => {
            const s = summaries[l.id] || {};
            return (
              <div key={l.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div className="loc-name">📍 {l.name}</div>
                  <span className="badge badge-ok">Active</span>
                </div>
                <div className="loc-sub">{l.address}</div>
                <dl className="loc-stats">
                  <dt>Inventory Value</dt>
                  <dd style={{ color: 'var(--amber-dark)' }}>₹{Number(s.inventory?.total_value || 0).toLocaleString('en-IN')}</dd>
                  <dt>Items Tracked</dt>
                  <dd>{s.inventory?.items || 0}</dd>
                  <dt>Low Stock Alerts</dt>
                  <dd style={{ color: s.inventory?.low_stock > 0 ? 'var(--coral)' : 'var(--teal)' }}>{s.inventory?.low_stock || 0}</dd>
                  <dt>Staff Present Today</dt>
                  <dd>{s.today_attendance?.present || 0} / {s.today_attendance?.total || 0}</dd>
                </dl>
                {l.phone && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>📞 {l.phone}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Locations;
