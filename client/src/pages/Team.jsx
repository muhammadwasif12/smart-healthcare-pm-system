import { useState, useEffect } from 'react';
import { getTeam, createTeamMember, updateTeamMember, deleteTeamMember } from '../services/api';
import { Users, Mail, Phone, DollarSign, Plus, Edit2, Trash2, Award, Briefcase } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function TeamPage() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({
    name: '', role: 'Backend Developer', email: '', phone: '', daily_rate: 3500
  });

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = () => {
    getTeam()
      .then(t => { setTeam(t); setLoading(false); })
      .catch(() => { toast.error('Failed to load team'); setLoading(false); });
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setForm({ name: '', role: 'Backend Developer', email: '', phone: '', daily_rate: 3500 });
    setShowModal(true);
  };

  const handleOpenEdit = (m) => {
    setEditingItem(m);
    setForm({
      name: m.name,
      role: m.role,
      email: m.email || '',
      phone: m.phone || '',
      daily_rate: m.daily_rate || 3500
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
        await updateTeamMember(editingItem.id, {
          ...form,
          daily_rate: parseFloat(form.daily_rate) || 0
        });
        toast.success('Team member updated');
      } else {
        await createTeamMember({
          ...form,
          daily_rate: parseFloat(form.daily_rate) || 0
        });
        toast.success('Team member added');
      }
      setShowModal(false);
      loadTeam();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save member');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;
    try {
      await deleteTeamMember(id);
      toast.success('Team member removed');
      loadTeam();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete assigned team member');
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const roleColors = {
    'Project Manager': '#22d3ee',
    'Senior Backend Developer': '#22c55e',
    'Backend Developer': '#10b981',
    'Senior Frontend Developer': '#f59e0b',
    'Frontend Developer': '#fbbf24',
    'Database Developer': '#06b6d4',
    'QA Engineer': '#ec4899',
  };

  const totalDailyBurn = team.reduce((acc, m) => acc + (parseFloat(m.daily_rate) || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><Users size={24} /> Project Team Directory</h2>
          <p className="page-subtitle">Human resource allocation, daily billing rates, and contact information</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> Add Member
        </button>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid mb-xl">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Team Size</span>
            <Users size={18} style={{ color: 'var(--accent-primary-light)' }} />
          </div>
          <div className="stat-value">{team.length}</div>
          <div className="stat-desc">Full-time project staff</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Daily Labor Burn</span>
            <DollarSign size={18} style={{ color: 'var(--accent-warning)' }} />
          </div>
          <div className="stat-value">PKR {totalDailyBurn.toLocaleString()}</div>
          <div className="stat-desc">Base rate / calendar work day</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Specializations</span>
            <Award size={18} style={{ color: 'var(--accent-secondary)' }} />
          </div>
          <div className="stat-value">5 Disciplines</div>
          <div className="stat-desc">PM, Backend, Frontend, DB, QA</div>
        </div>
      </div>

      {/* Team Cards Grid */}
      <div className="grid-3" style={{ gap: 'var(--space-md)' }}>
        {team.map(m => {
          const color = roleColors[m.role] || '#14b8a6';
          const initials = m.name.split(' ').map(n => n[0]).join('').slice(0, 2);
          return (
            <div className="card team-card" key={m.id} style={{ borderTop: `3px solid ${color}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div className="flex justify-between items-start mb-md">
                  <div className="flex items-center gap-md">
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: `${color}20`,
                      border: `1.5px solid ${color}40`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: color
                    }}>
                      {initials}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{m.name}</div>
                      <span className="badge badge-neutral" style={{ fontSize: '0.75rem', marginTop: 2 }}>{m.role}</span>
                    </div>
                  </div>
                  <div className="flex gap-xs">
                    <button className="btn btn-icon btn-ghost btn-sm" onClick={() => handleOpenEdit(m)} title="Edit">
                      <Edit2 size={13} />
                    </button>
                    <button className="btn btn-icon btn-ghost btn-sm text-danger" onClick={() => handleDelete(m.id)} title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="team-contact" style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.85rem' }}>
                  <div className="flex items-center gap-xs text-secondary">
                    <Mail size={13} className="text-muted" /> {m.email || '—'}
                  </div>
                  <div className="flex items-center gap-xs text-secondary">
                    <Phone size={13} className="text-muted" /> {m.phone || '—'}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-xs text-muted">Daily Rate</span>
                <span style={{ fontWeight: 700, color: 'var(--accent-primary-light)', fontSize: '0.95rem' }}>
                  PKR {parseFloat(m.daily_rate || 0).toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>/day</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingItem ? 'Edit Team Member' : 'Add Team Member'}</div>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Sarah Ali"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select
                    className="form-select"
                    value={form.role}
                    onChange={e => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="Project Manager">Project Manager</option>
                    <option value="Senior Backend Developer">Senior Backend Developer</option>
                    <option value="Backend Developer">Backend Developer</option>
                    <option value="Senior Frontend Developer">Senior Frontend Developer</option>
                    <option value="Frontend Developer">Frontend Developer</option>
                    <option value="Database Developer">Database Developer</option>
                    <option value="QA Engineer">QA Engineer</option>
                  </select>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-input"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="e.g. sarah.ali@healthtech.pk"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      placeholder="e.g. +92-301-2345678"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Daily Billing Rate (PKR) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={100}
                    className="form-input"
                    value={form.daily_rate}
                    onChange={e => setForm({ ...form, daily_rate: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingItem ? 'Save Changes' : 'Add Member'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
