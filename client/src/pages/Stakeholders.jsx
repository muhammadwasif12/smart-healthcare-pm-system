import { useState, useEffect } from 'react';
import { getStakeholders, createStakeholder, updateStakeholder, deleteStakeholder } from '../services/api';
import { Users, Plus, Edit2, Trash2, Mail, Building, ShieldAlert, CheckCircle, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function StakeholdersPage() {
  const [stakeholders, setStakeholders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({
    name: '', role: '', organization: '', influence: 'Medium', interest: 'Medium', contact: ''
  });

  useEffect(() => {
    loadStakeholders();
  }, []);

  const loadStakeholders = () => {
    getStakeholders()
      .then(s => { setStakeholders(s); setLoading(false); })
      .catch(() => { toast.error('Failed to load stakeholders'); setLoading(false); });
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setForm({ name: '', role: '', organization: '', influence: 'Medium', interest: 'Medium', contact: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (s) => {
    setEditingItem(s);
    setForm({
      name: s.name,
      role: s.role,
      organization: s.organization || '',
      influence: s.influence || 'Medium',
      interest: s.interest || 'Medium',
      contact: s.contact || ''
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.role) {
      toast.error('Name and Role are required');
      return;
    }
    try {
      if (editingItem) {
        await updateStakeholder(editingItem.id, form);
        toast.success('Stakeholder updated');
      } else {
        await createStakeholder(form);
        toast.success('Stakeholder added');
      }
      setShowModal(false);
      loadStakeholders();
    } catch {
      toast.error('Failed to save stakeholder');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this stakeholder?')) return;
    try {
      await deleteStakeholder(id);
      toast.success('Stakeholder removed');
      loadStakeholders();
    } catch {
      toast.error('Failed to delete stakeholder');
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const filtered = stakeholders.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase()) ||
    (s.organization && s.organization.toLowerCase().includes(search.toLowerCase()))
  );

  // Power / Interest Quadrants:
  // Manage Closely: High Power, High Interest
  // Keep Satisfied: High Power, Medium/Low Interest
  // Keep Informed: Medium/Low Power, High Interest
  // Monitor: Medium/Low Power, Medium/Low Interest
  const manageClosely = stakeholders.filter(s => s.influence === 'High' && s.interest === 'High');
  const keepSatisfied = stakeholders.filter(s => s.influence === 'High' && s.interest !== 'High');
  const keepInformed = stakeholders.filter(s => s.influence !== 'High' && s.interest === 'High');
  const monitor = stakeholders.filter(s => s.influence !== 'High' && s.interest !== 'High');

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><Users size={24} /> Stakeholder Register & Matrix</h2>
          <p className="page-subtitle">Identification, power/interest categorization, and engagement governance</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> Add Stakeholder
        </button>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid mb-xl">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Stakeholders</span>
            <Users size={18} style={{ color: 'var(--accent-primary-light)' }} />
          </div>
          <div className="stat-value">{stakeholders.length}</div>
          <div className="stat-desc">Identified key entities</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Key Decision Makers</span>
            <ShieldAlert size={18} style={{ color: 'var(--accent-danger)' }} />
          </div>
          <div className="stat-value">{stakeholders.filter(s => s.influence === 'High').length}</div>
          <div className="stat-desc">High Influence (Sponsor & Regulators)</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Manage Closely</span>
            <CheckCircle size={18} style={{ color: 'var(--accent-warning)' }} />
          </div>
          <div className="stat-value">{manageClosely.length}</div>
          <div className="stat-desc">High Power & High Interest</div>
        </div>
      </div>

      {/* Power-Interest 2x2 Matrix */}
      <div className="card mb-xl">
        <div className="card-header">
          <div className="card-title">Power / Interest Grid (Mendelow's Matrix)</div>
        </div>
        <div className="grid-2" style={{ gap: 'var(--space-md)' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>
            <div className="flex justify-between items-center mb-xs">
              <span style={{ fontWeight: 600, color: 'var(--accent-danger)', fontSize: '0.9rem' }}>High Power · High Interest</span>
              <span className="badge badge-danger">Manage Closely</span>
            </div>
            <div className="flex flex-wrap gap-xs">
              {manageClosely.map(s => (
                <div key={s.id} className="badge badge-neutral" style={{ padding: '4px 8px' }}>
                  {s.name} <span className="text-muted">({s.role})</span>
                </div>
              ))}
              {manageClosely.length === 0 && <span className="text-muted text-xs">None</span>}
            </div>
          </div>

          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>
            <div className="flex justify-between items-center mb-xs">
              <span style={{ fontWeight: 600, color: 'var(--accent-warning)', fontSize: '0.9rem' }}>High Power · Low/Med Interest</span>
              <span className="badge badge-warning">Keep Satisfied</span>
            </div>
            <div className="flex flex-wrap gap-xs">
              {keepSatisfied.map(s => (
                <div key={s.id} className="badge badge-neutral" style={{ padding: '4px 8px' }}>
                  {s.name} <span className="text-muted">({s.role})</span>
                </div>
              ))}
              {keepSatisfied.length === 0 && <span className="text-muted text-xs">None</span>}
            </div>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>
            <div className="flex justify-between items-center mb-xs">
              <span style={{ fontWeight: 600, color: 'var(--accent-primary-light)', fontSize: '0.9rem' }}>Low/Med Power · High Interest</span>
              <span className="badge badge-primary">Keep Informed</span>
            </div>
            <div className="flex flex-wrap gap-xs">
              {keepInformed.map(s => (
                <div key={s.id} className="badge badge-neutral" style={{ padding: '4px 8px' }}>
                  {s.name} <span className="text-muted">({s.role})</span>
                </div>
              ))}
              {keepInformed.length === 0 && <span className="text-muted text-xs">None</span>}
            </div>
          </div>

          <div style={{ background: 'rgba(148, 163, 184, 0.08)', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>
            <div className="flex justify-between items-center mb-xs">
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Low/Med Power · Low/Med Interest</span>
              <span className="badge badge-neutral">Monitor</span>
            </div>
            <div className="flex flex-wrap gap-xs">
              {monitor.map(s => (
                <div key={s.id} className="badge badge-neutral" style={{ padding: '4px 8px' }}>
                  {s.name} <span className="text-muted">({s.role})</span>
                </div>
              ))}
              {monitor.length === 0 && <span className="text-muted text-xs">None</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Stakeholder Register Table */}
      <div className="card">
        <div className="card-header flex justify-between items-center">
          <div className="card-title">Stakeholder Directory</div>
          <div className="flex items-center gap-xs" style={{ width: 260 }}>
            <Search size={16} className="text-muted" />
            <input
              type="text"
              className="form-input"
              placeholder="Search stakeholders..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Organization</th>
                <th>Influence</th>
                <th>Interest</th>
                <th>Contact</th>
                <th style={{ width: 90 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td className="font-bold">{s.name}</td>
                  <td>{s.role}</td>
                  <td className="text-sm">
                    <span className="flex items-center gap-xs">
                      <Building size={14} className="text-muted" /> {s.organization || 'Internal'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${s.influence === 'High' ? 'badge-danger' : s.influence === 'Medium' ? 'badge-warning' : 'badge-neutral'}`}>
                      {s.influence}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${s.interest === 'High' ? 'badge-danger' : s.interest === 'Medium' ? 'badge-warning' : 'badge-neutral'}`}>
                      {s.interest || 'Medium'}
                    </span>
                  </td>
                  <td className="text-sm">
                    {s.contact ? (
                      <span className="flex items-center gap-xs text-muted">
                        <Mail size={13} /> {s.contact}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    <div className="flex items-center gap-xs">
                      <button className="btn btn-icon btn-ghost btn-sm" onClick={() => handleOpenEdit(s)} title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button className="btn btn-icon btn-ghost btn-sm text-danger" onClick={() => handleDelete(s.id)} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted" style={{ padding: 'var(--space-lg)' }}>
                    No stakeholders matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingItem ? 'Edit Stakeholder' : 'Add New Stakeholder'}</div>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div className="form-group">
                  <label className="form-label">Stakeholder Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Dr. Ayesha, Hospital Board"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={form.role}
                    onChange={e => setForm({ ...form, role: e.target.value })}
                    placeholder="e.g. Sponsor, End User, Medical Staff"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Organization</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.organization}
                    onChange={e => setForm({ ...form, organization: e.target.value })}
                    placeholder="e.g. City Hospital Network"
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Influence (Power)</label>
                    <select
                      className="form-select"
                      value={form.influence}
                      onChange={e => setForm({ ...form, influence: e.target.value })}
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Interest</label>
                    <select
                      className="form-select"
                      value={form.interest}
                      onChange={e => setForm({ ...form, interest: e.target.value })}
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Email / Phone</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.contact}
                    onChange={e => setForm({ ...form, contact: e.target.value })}
                    placeholder="e.g. board@cityhospital.pk"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingItem ? 'Save Changes' : 'Create Stakeholder'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
