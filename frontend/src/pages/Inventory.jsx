import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { inventoryAPI, locationAPI } from '../api';

const UNITS = ['kg', 'L', 'pcs', 'boxes', 'bottles', 'g', 'ml'];
const blank = { name: '', category_id: '', location_id: '', quantity: '', unit: 'kg', unit_price: '', min_stock: '10' };

export default function Inventory() {
  const { selectedLoc } = useOutletContext();
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [locs, setLocs] = useState([]);
  const [filters, setFilters] = useState({ search: '', category_id: '', status: '' });
  const [modal, setModal] = useState(null); // null | 'add' | 'edit' | 'restock'
  const [form, setForm] = useState(blank);
  const [txForm, setTxForm] = useState({ type: 'restock', quantity: '', note: '' });
  const [editId, setEditId] = useState(null);

  const load = useCallback(() => {
    const params = { ...(selectedLoc !== 'all' && { location_id: selectedLoc }), ...filters };
    inventoryAPI.list(params).then(r => setItems(r.data));
  }, [selectedLoc, filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    inventoryAPI.categories().then(r => setCats(r.data));
    locationAPI.list().then(r => setLocs(r.data));
  }, []);
  useEffect(() => {
    window.addEventListener('locationChange', load);
    return () => window.removeEventListener('locationChange', load);
  }, [load]);

  function openAdd() { setForm({ ...blank, location_id: selectedLoc !== 'all' ? selectedLoc : '' }); setModal('add'); }
  function openEdit(item) {
    setForm({ name: item.name, category_id: item.category_id, location_id: item.location_id,
              quantity: item.quantity, unit: item.unit, unit_price: item.unit_price, min_stock: item.min_stock });
    setEditId(item.id); setModal('edit');
  }
  function openRestock(item) { setEditId(item.id); setTxForm({ type: 'restock', quantity: '', note: '' }); setModal('restock'); }

  async function save() {
    if (modal === 'add') await inventoryAPI.create(form);
    if (modal === 'edit') await inventoryAPI.update(editId, form);
    setModal(null); load();
  }

  async function saveTransaction() {
    await inventoryAPI.transaction(editId, txForm);
    setModal(null); load();
  }

  async function del(id) {
    if (!confirm('Delete this item?')) return;
    await inventoryAPI.delete(id);
    load();
  }

  const totalVal = items.reduce((s, i) => s + parseFloat(i.total_value || 0), 0);

  return (
    <div>
      <div className="topbar">
        <div><h1>Inventory</h1><div className="sub">{items.length} items · Total value ₹{totalVal.toLocaleString('en-IN')}</div></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Item</button>
      </div>
      <div className="page">
        <div className="table-header">
          <div className="toolbar">
            <input className="form-control" placeholder="Search items…" value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })} />
            <select className="form-control" value={filters.category_id}
              onChange={e => setFilters({ ...filters, category_id: e.target.value })}>
              <option value="">All Categories</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="form-control" value={filters.status}
              onChange={e => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All Status</option>
              <option value="low">Low Stock</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th><th>Category</th><th>Location</th><th>Qty</th>
                  <th>Unit Price</th><th>Total Value</th><th>Stock</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const pct = Math.min(100, Math.round((item.quantity / item.min_stock) * 50));
                  const cls = item.stock_status === 'critical' ? 'critical' : item.stock_status === 'low' ? 'low' : 'ok';
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500 }}>{item.name}</td>
                      <td><span style={{ fontSize: 11, background: 'var(--gray-100)', color: 'var(--gray-600)', padding: '2px 8px', borderRadius: 20 }}>{item.category}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>{item.location}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{item.quantity} {item.unit}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>₹{Number(item.unit_price).toLocaleString('en-IN')}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>₹{Number(item.total_value).toLocaleString('en-IN')}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="progress"><div className={`progress-fill progress-${cls}`} style={{ width: `${pct}%` }}></div></div>
                          <span className={`badge badge-${cls}`}>{cls === 'ok' ? 'OK' : cls === 'low' ? 'Low' : 'Critical'}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-sm" onClick={() => openRestock(item)}>Restock</button>
                          <button className="btn btn-sm" onClick={() => openEdit(item)}>Edit</button>
                          <button className="btn btn-sm btn-danger" onClick={() => del(item.id)}>✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!items.length && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No items found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{modal === 'add' ? 'Add Inventory Item' : 'Edit Item'}</span>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Item Name</label>
              <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Chicken Breast" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-control" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                  <option value="">Select…</option>
                  {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <select className="form-control" value={form.location_id} onChange={e => setForm({ ...form, location_id: e.target.value })}>
                  <option value="">Select…</option>
                  {locs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input className="form-control" type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="50" />
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <select className="form-control" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Unit Price (₹)</label>
                <input className="form-control" type="number" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: e.target.value })} placeholder="250" />
              </div>
              <div className="form-group">
                <label className="form-label">Min Stock Level</label>
                <input className="form-control" type="number" value={form.min_stock} onChange={e => setForm({ ...form, min_stock: e.target.value })} placeholder="10" />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>{modal === 'add' ? 'Add Item' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Restock / Transaction Modal */}
      {modal === 'restock' && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Stock Transaction</span>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Transaction Type</label>
              <select className="form-control" value={txForm.type} onChange={e => setTxForm({ ...txForm, type: e.target.value })}>
                <option value="restock">Restock (Add stock)</option>
                <option value="consumption">Consumption (Use stock)</option>
                <option value="adjustment">Adjustment (Set exact qty)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input className="form-control" type="number" value={txForm.quantity} onChange={e => setTxForm({ ...txForm, quantity: e.target.value })} placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Note (optional)</label>
              <input className="form-control" value={txForm.note} onChange={e => setTxForm({ ...txForm, note: e.target.value })} placeholder="e.g. Received from supplier" />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveTransaction}>Save Transaction</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
