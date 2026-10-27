import { useState, useEffect } from 'react';
import { getMilestones, createMilestone, updateMilestone, deleteMilestone } from '../services/api';
import { useAppContext } from '../App';
import { Milestone, Calendar, CheckCircle2, Clock, AlertCircle, Plus, Edit3, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const EMPTY = { name: '', planned_date: '', actual_date: '', status: 'Pending', description: '' };

export default function MilestonesPage() {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const { statusDate } = useAppContext();

  const load = () => {
    setLoading(true);
    getMilestones(statusDate).then(m => { setMilestones(m); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, [statusDate]);

  const openAdd = () => { setForm({ ...EMPTY }); setEditId(null); setShowModal(true); };
  const openEdit = (m) => {
    setForm({ name: m.name, planned_date: m.planned_date, actual_date: m.actual_date || '', status: m.status, description: m.description || '' });
    setEditId(m.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.planned_date) { toast.error('Name and planned date required'); return; }
    try {
      if (editId) {
        await updateMilestone(editId, form);
        toast.success('Milestone updated');
      } else {
        await createMilestone(form);
        toast.success('Milestone created');
      }
      setShowModal(false);
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this milestone?')) return;
    try {
      await deleteMilestone(id);
      toast.success('Milestone deleted');
      load();
    } catch { toast.error('Delete failed'); }
  };

  const statusIcon = (s, isDelayed) => {
    if (s === 'Completed') return <CheckCircle2 size={20} color="#22c55e" />;
    if (isDelayed) return <AlertTriangle size={20} color="#ef4444" />;
    if (s === 'In Progress') return <Clock size={20} color="#3b82f6" />;
    return <AlertCircle size={20} color="#64748b" />;
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const completed = milestones.filter(m => m.status === 'Completed').length;
  const delayedMilestones = milestones.filter(m => m.status !== 'Completed' && (m.is_delayed || m.planned_date < statusDate));
  const inProgress = milestones.filter(m => m.status === 'In Progress' && !delayedMilestones.some(d => d.id === m.id)).length;
  const pending = milestones.length - completed - delayedMilestones.length - inProgress;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><Milestone size={24} /> Milestones</h2>
          <p className="page-subtitle">
            {milestones.length} total • {completed} completed •{' '}
            {delayedMilestones.length > 0 ? (
              <span style={{ color: 'var(--status-danger)', fontWeight: 600 }}>{delayedMilestones.length} delayed • </span>
            ) : null}
            {inProgress} in progress
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Milestone
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="metric-card success">
          <div className="metric-label">Completed</div>
          <div className="metric-value success">{completed}</div>
        </div>
        <div className={`metric-card ${delayedMilestones.length > 0 ? 'danger' : 'neutral'}`}>
          <div className="metric-label">Delayed</div>
          <div className={`metric-value ${delayedMilestones.length > 0 ? 'danger' : ''}`}>{delayedMilestones.length}</div>
          <div className="metric-subtitle">{delayedMilestones.length > 0 ? 'Past status date' : 'None delayed'}</div>
        </div>
        <div className="metric-card info">
          <div className="metric-label">In Progress</div>
          <div className="metric-value info">{inProgress}</div>
        </div>
        <div className="metric-card neutral">
          <div className="metric-label">Pending</div>
          <div className="metric-value">{pending}</div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative', paddingLeft: 40 }}>
        <div style={{ position: 'absolute', left: 19, top: 0, bottom: 0, width: 2, background: 'var(--border-color)' }} />

        {milestones.map((m) => {
          const isDelayed = m.status !== 'Completed' && (m.is_delayed || m.planned_date < statusDate);
          const daysLate = m.delay_days || Math.max(1, Math.round((new Date(statusDate + 'T00:00:00Z') - new Date(m.planned_date + 'T00:00:00Z')) / 86400000));
          const diamondColor = m.status === 'Completed' ? '#22c55e' : isDelayed ? '#ef4444' : m.status === 'In Progress' ? '#3b82f6' : 'var(--bg-tertiary)';
          const diamondBorder = m.status === 'Completed' ? '#22c55e' : isDelayed ? '#ef4444' : m.status === 'In Progress' ? '#3b82f6' : 'var(--border-color)';
          const diamondShadow = isDelayed ? '0 0 12px rgba(239,68,68,0.5)' : m.status === 'In Progress' ? '0 0 12px rgba(59,130,246,0.4)' : 'none';

          return (
            <div key={m.id} style={{ position: 'relative', marginBottom: 'var(--space-xl)', paddingLeft: 'var(--space-xl)' }}>
              {/* Diamond marker ◆ */}
              <div style={{
                position: 'absolute', left: -21, top: 16, width: 16, height: 16, zIndex: 2,
                transform: 'rotate(45deg)',
                background: diamondColor,
                border: `3px solid ${diamondBorder}`,
                boxShadow: diamondShadow,
              }} />

              <div className="card" style={isDelayed ? { borderColor: 'rgba(239, 68, 68, 0.4)' } : {}}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-md">
                    {statusIcon(m.status, isDelayed)}
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{m.name}</h3>
                      <p className="text-xs text-muted">{m.description || ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-md">
                    <div className="text-right">
                      <div className="font-mono text-sm" style={{ color: isDelayed ? 'var(--status-danger)' : 'var(--accent-primary-light)' }}>
                        {m.planned_date}
                      </div>
                      {m.actual_date && <div className="font-mono text-xs text-muted">Actual: {m.actual_date}</div>}
                      <div className="flex gap-xs items-center justify-end" style={{ marginTop: 4 }}>
                        {isDelayed && (
                          <span className="badge badge-danger">Delayed ({daysLate}d late)</span>
                        )}
                        <span className={`badge ${m.status === 'Completed' ? 'badge-success' : isDelayed ? 'badge-danger' : m.status === 'In Progress' ? 'badge-info' : 'badge-neutral'}`}>
                          {m.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-xs">
                      <button className="btn btn-icon btn-ghost btn-sm" onClick={() => openEdit(m)} title="Edit">
                        <Edit3 size={14} />
                      </button>
                      <button className="btn btn-icon btn-ghost btn-sm" onClick={() => handleDelete(m.id)} title="Delete" style={{ color: 'var(--status-danger)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editId ? 'Edit Milestone' : 'Add Milestone'}</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Milestone Name *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Design Phase Complete" />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Planned Date *</label>
                  <input type="date" value={form.planned_date} onChange={e => setForm({ ...form, planned_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Actual Date</label>
                  <input type="date" value={form.actual_date} onChange={e => setForm({ ...form, actual_date: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Optional description" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>{editId ? 'Save Changes' : 'Create Milestone'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
