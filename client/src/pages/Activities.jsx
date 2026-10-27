import { useState, useEffect } from 'react';
import { getActivities, updateActivity } from '../services/api';
import { Activity, Search, ArrowUpDown } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ActivitiesPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editPercent, setEditPercent] = useState(0);

  useEffect(() => {
    getActivities().then(a => { setActivities(a); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = activities.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) || a.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleUpdate = async (id) => {
    try {
      await updateActivity(id, { percent_complete: editPercent });
      setActivities(activities.map(a => a.id === id ? { ...a, percent_complete: editPercent, status: editPercent === 100 ? 'Completed' : editPercent > 0 ? 'In Progress' : 'Not Started' } : a));
      setEditingId(null);
      toast.success('Progress updated');
    } catch (error) { toast.error(error.response?.data?.message || 'Update failed'); }
  };

  const statusBadge = (s) => {
    const map = { Completed: 'badge-success', 'In Progress': 'badge-info', 'Not Started': 'badge-neutral', Delayed: 'badge-danger' };
    return <span className={`badge ${map[s] || 'badge-neutral'}`}>{s}</span>;
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><Activity size={24} /> Activity Management</h2>
          <p className="page-subtitle">{activities.length} activities • Click progress to edit</p>
        </div>
        <div className="flex gap-sm items-center">
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32, width: 200 }} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Code</th><th>Name</th><th>Duration</th><th>Planned</th><th>Actual Start</th><th>Budget</th><th>Progress</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id}>
                  <td className="font-mono text-xs">{a.code}</td>
                  <td style={{ maxWidth: 200 }} className="truncate">{a.name}</td>
                  <td className="text-center">{a.duration}d</td>
                  <td className="font-mono text-xs">{a.planned_start} → {a.planned_end}</td>
                  <td className="font-mono text-xs">{a.actual_start || '—'}</td>
                  <td className="text-right font-mono">₨{(a.estimated_cost / 1000).toFixed(0)}K</td>
                  <td style={{ width: 140 }}>
                    {editingId === a.id ? (
                      <div className="flex gap-sm items-center">
                        <input type="number" className="form-input" value={editPercent} onChange={e => setEditPercent(parseInt(e.target.value) || 0)} min={0} max={100} style={{ width: 60, padding: '2px 6px' }} />
                        <button className="btn btn-primary btn-sm" onClick={() => handleUpdate(a.id)}>✓</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>✗</button>
                      </div>
                    ) : (
                      <div onClick={() => { setEditingId(a.id); setEditPercent(a.percent_complete); }} style={{ cursor: 'pointer' }}>
                        <div className="flex items-center gap-sm">
                          <div className="progress-bar" style={{ flex: 1 }}>
                            <div className={`progress-fill ${a.percent_complete === 100 ? 'success' : a.percent_complete > 0 ? '' : ''}`} style={{ width: `${a.percent_complete}%` }} />
                          </div>
                          <span className="text-xs font-mono">{a.percent_complete}%</span>
                        </div>
                      </div>
                    )}
                  </td>
                  <td>{statusBadge(a.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
