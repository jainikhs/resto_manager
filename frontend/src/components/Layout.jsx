import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { locationAPI } from '../api';

const ICONS = {
  dashboard: '▦', inventory: '📦', attendance: '👥',
  employees: '🪪', locations: '📍', reports: '📊',
};

export default function Layout() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [selectedLoc, setSelectedLoc] = useState('all');
  const user = JSON.parse(localStorage.getItem('rm_user') || '{}');

  useEffect(() => {
    locationAPI.list().then(r => setLocations(r.data));
  }, []);

  function logout() {
    localStorage.removeItem('rm_token');
    localStorage.removeItem('rm_user');
    navigate('/login');
  }

  const navItems = [
    { to: '/',           label: 'Dashboard',  icon: '▦' },
    { to: '/inventory',  label: 'Inventory',  icon: '📦' },
    { to: '/attendance', label: 'Attendance', icon: '👥' },
    { to: '/employees',  label: 'Employees',  icon: '🪪' },
    { to: '/locations',  label: 'Locations',  icon: '📍' },
    { to: '/reports',    label: 'Reports',    icon: '📊' },
  ];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="icon">🍽</span>
          <div>
            <div className="name">Resto Manager</div>
            <div className="sub">5 Locations</div>
          </div>
        </div>

        <div className="sidebar-loc">
          <label>Active Location</label>
          <select value={selectedLoc} onChange={e => {
            setSelectedLoc(e.target.value);
            localStorage.setItem('rm_loc', e.target.value);
            window.dispatchEvent(new CustomEvent('locationChange', { detail: e.target.value }));
          }}>
            <option value="all">All Locations</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="icon">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">Signed in as <strong>{user.username || 'admin'}</strong></div>
          <button onClick={logout}>Sign out</button>
        </div>
      </aside>

      <main className="main">
        <Outlet context={{ selectedLoc, locations }} />
      </main>
    </div>
  );
}
