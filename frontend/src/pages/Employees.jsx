import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { employeeAPI, locationAPI } from '../api';

const ROLES = ['Manager','Chef','Sous Chef','Waiter','Cashier','Cleaner','Security'];
const blank = { name: '', role: 'Chef', location_id: '', phone: '', email: '', hire_date: '' };

export default function Employees() {
  const { selectedLoc } = useOutletContext();
  const [employees, setEmployees] = useState([]);
  const [locs, setLocs] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    const params = selectedLoc !== 'all' ? { location_id: selectedLoc } : {};
    employeeAPI.list(params).then(r => setEmployees(r.data));
  }, [selectedLoc]);

  useEffect(() => { load(); locationAPI.list().then(r => setLocs(r.data)); }, [load]);
  useEffect(() => {
    window.addEventListener('locationChange', load);
    return () => window.removeEventListener('locationChange', load);
  }, [load]);

  function openAdd() { setForm({ ...blank, location_id: selectedLoc !== 'all' ? selectedLoc : '' }); setEditId(null); setModal(true); }
  function openEdit(emp) {
    setForm({ name: emp.name, role: emp.role, location_id: emp.location_id,
              phone: emp.phone || '', email: emp.email || '', hire_date: emp.hire_date?.slice(0,10) || '' });
    setEditId(emp.id); setModal(true);
  }
  async function save() {
    if (editId) await employeeAPI.update(editId, form);
    else await employeeAPI.create(form);
    setModal(false); load();
  }
  async function del(id) {
    if (!confirm('Remove this employee?')) return;
    await employeeAPI.delete(id);
    load();
  }

  const visible = employees.filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="topbar">
        <div><h1>Employees</h1><div className="sub">{employees.length} active staff</div></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Employee</button>
      </div>
      <div className="page">
        <div style={{ marginBottom: 14 }}>
          <input className="form-control" style={{ width: 240 }} placeholder="Search…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Name</th><th>Role</th><th>Location</th><th>Phone</th><th>Hire Date</th><th>Actions</th></tr></thead>
            <tbody>
              {visible.map(emp => (
                <tr key={emp.id}>
                  <td style={{ fontWeight: 500 }}>{emp.name}</td>
                  <td><span style={{ fontSize: 11, background: 'var(--gray-100)', padding: '2px 8px', borderRadius: 20 }}>{emp.role}</span></td>
                  <td style={{ color: 'var(--text-muted)' }}>{emp.location_name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{emp.phone || '—'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('en-IN') : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm" onClick={() => openEdit(emp)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => del(emp.id)}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!visible.length && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No employees found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editId ? 'Edit Employee' : 'Add Employee'}</span>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="form-group"><label className="form-label">Full Name</label>
              <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Priya Sharma" /></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Role</label>
                <select className="form-control" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Location</label>
                <select className="form-control" value={form.location_id} onChange={e => setForm({ ...form, location_id: e.target.value })}>
                  <option value="">Select…</option>
                  {locs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Phone</label>
                <input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91-98..." /></div>
              <div className="form-group"><label className="form-label">Email</label>
                <input className="form-control" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" /></div>
            </div>
            <div className="form-group"><label className="form-label">Hire Date</label>
              <input className="form-control" type="date" value={form.hire_date} onChange={e => setForm({ ...form, hire_date: e.target.value })} /></div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>{editId ? 'Save' : 'Add Employee'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
