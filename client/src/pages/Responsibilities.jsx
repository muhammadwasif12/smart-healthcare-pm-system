import { useState, useEffect } from 'react';
import { getResponsibilities, createResponsibility, deleteResponsibility, getTeam } from '../services/api';
import { Grid3X3, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const TYPES = ['R', 'A', 'C', 'I'];
const TYPE_COLORS = {
  R: { bg: '#dbeafe', color: '#1e40af', label: 'Responsible' },
  A: { bg: '#fef3c7', color: '#92400e', label: 'Accountable' },
  C: { bg: '#d1fae5', color: '#065f46', label: 'Consulted' },
  I: { bg: '#ede9fe', color: '#5b21b6', label: 'Informed' },
};

export default function ResponsibilitiesPage() {
  const [data, setData] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ team_member_id: '', deliverable: '', responsibility_type: 'R' });

  const load = () => {
    setLoading(true);
    Promise.all([getResponsibilities(), getTeam()])
      .then(([r, t]) => { setData(r); setTeam(t); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, []);

  // Build matrix: deliverables (rows) x team members (columns)
  const deliverables = [...new Set(data.map(d => d.deliverable))].sort();
  const members = team.length > 0 ? team : [...new Set(data.map(d => ({ id: d.team_member_id, name: d.member_name })))];

  const getCell = (deliverable, memberId) => {
    return data.filter(d => d.deliverable === deliverable && d.team_member_id === memberId);
  };

  const handleAdd = async () => {
    if (!form.team_member_id || !form.deliverable) {
      toast.error('Please fill all fields');
      return;
    }
    try {
      await createResponsibility(form);
      toast.success('RACI assignment added');
      setShowModal(false);
      setForm({ team_member_id: '', deliverable: '', responsibility_type: 'R' });
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to add');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this RACI assignment?')) return;
    try {
      await deleteResponsibility(id);
      toast.success('Assignment removed');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><Grid3X3 size={24} /> Responsibilities (RACI) Matrix</h2>
          <p className="page-subtitle">
            R = Responsible • A = Accountable • C = Consulted • I = Informed
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Assignment
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-md flex-wrap" style={{ marginBottom: 'var(--space-lg)' }}>
        {Object.entries(TYPE_COLORS).map(([key, val]) => (
          <div key={key} className="flex items-center gap-sm">
            <span style={{
              display: 'inline-block', width: 28, height: 28, borderRadius: 6,
              background: val.bg, color: val.color, fontWeight: 800, fontSize: '0.85rem',
              textAlign: 'center', lineHeight: '28px',
            }}>{key}</span>
            <span className="text-sm">{val.label}</span>
          </div>
        ))}
      </div>

      {/* RACI Matrix Table */}
      <div className="card">
        <div className="raci-scroll-hint text-xs text-muted">Scroll horizontally to view all team members.</div>
        <div className="table-container raci-table-container" style={{ overflowX: 'auto' }}>
          <table className="raci-table">
            <thead>
              <tr>
                <th style={{ minWidth: 180, position: 'sticky', left: 0, background: 'var(--bg-secondary)', zIndex: 2 }}>
                  Deliverable
                </th>
                {members.map(m => (
                  <th key={m.id} style={{ textAlign: 'center', minWidth: 100, fontSize: '0.75rem' }}>
                    <div>{m.name?.split(' ')[0]}</div>
                    <div className="text-xs text-muted" style={{ fontWeight: 400 }}>{m.role}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deliverables.map(del => (
                <tr key={del}>
                  <td style={{ fontWeight: 600, fontSize: '0.85rem', position: 'sticky', left: 0, background: 'var(--bg-primary)', zIndex: 1 }}>
                    {del}
                  </td>
                  {members.map(m => {
                    const cells = getCell(del, m.id);
                    return (
                      <td key={m.id} style={{ textAlign: 'center', padding: '0.5rem' }}>
                        <div className="flex items-center justify-center gap-xs flex-wrap">
                          {cells.length > 0 ? cells.map(c => (
                            <span
                              key={c.id}
                              onClick={() => handleDelete(c.id)}
                              title={`${TYPE_COLORS[c.responsibility_type]?.label} — Click to remove`}
                              style={{
                                display: 'inline-block',
                                width: 30,
                                height: 30,
                                borderRadius: 6,
                                background: TYPE_COLORS[c.responsibility_type]?.bg || '#f1f5f9',
                                color: TYPE_COLORS[c.responsibility_type]?.color || '#475569',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                lineHeight: '30px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                border: '1px solid transparent',
                              }}
                              onMouseEnter={e => { e.target.style.transform = 'scale(1.1)'; e.target.style.borderColor = 'var(--accent-primary)'; }}
                              onMouseLeave={e => { e.target.style.transform = 'scale(1)'; e.target.style.borderColor = 'transparent'; }}
                            >
                              {c.responsibility_type}
                            </span>
                          )) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>—</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Assignment Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add RACI Assignment</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Team Member</label>
                <select value={form.team_member_id} onChange={e => setForm({ ...form, team_member_id: Number(e.target.value) })}>
                  <option value="">Select member…</option>
                  {team.map(t => <option key={t.id} value={t.id}>{t.name} ({t.role})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Deliverable</label>
                <input
                  type="text"
                  value={form.deliverable}
                  onChange={e => setForm({ ...form, deliverable: e.target.value })}
                  placeholder="e.g., Core Modules"
                  list="deliverables-list"
                />
                <datalist id="deliverables-list">
                  {deliverables.map(d => <option key={d} value={d} />)}
                </datalist>
              </div>
              <div className="form-group">
                <label>Responsibility Type</label>
                <div className="flex gap-md">
                  {TYPES.map(t => (
                    <label key={t} className="flex items-center gap-sm" style={{ cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="rtype"
                        value={t}
                        checked={form.responsibility_type === t}
                        onChange={e => setForm({ ...form, responsibility_type: e.target.value })}
                      />
                      <span style={{
                        padding: '4px 10px', borderRadius: 6, fontWeight: 700, fontSize: '0.85rem',
                        background: TYPE_COLORS[t].bg, color: TYPE_COLORS[t].color,
                      }}>{t}</span>
                      <span className="text-sm">{TYPE_COLORS[t].label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd}>Add Assignment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
