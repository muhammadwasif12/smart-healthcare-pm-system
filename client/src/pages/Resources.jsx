import { useState, useEffect } from 'react';
import { getResourceWorkload } from '../services/api';
import { Clock, Users, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const OVERALLOC_THRESHOLD = 3; // 3+ concurrent active tasks = over-allocated

export default function ResourcesPage() {
  const [workload, setWorkload] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getResourceWorkload().then(w => { setWorkload(w); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const overAllocated = workload.filter(w => w.active_activities >= OVERALLOC_THRESHOLD);

  const chartData = workload.map(w => ({
    name: w.name.split(' ')[0],
    Activities: w.total_activities,
    Active: w.active_activities,
    Completed: w.completed_activities,
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><Clock size={24} /> Resource Workload</h2>
          <p className="page-subtitle">{workload.length} team members • {overAllocated.length} over-allocated</p>
        </div>
      </div>

      {/* Over-Allocation Warning Banner */}
      {overAllocated.length > 0 && (
        <div className="alert alert-danger" style={{ marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
              ⚠ Over-Allocation Detected
            </div>
            <div className="text-sm">
              {overAllocated.map(w => (
                <div key={w.id} style={{ marginBottom: '0.15rem' }}>
                  <strong>{w.name}</strong> ({w.role}) — <span style={{ color: 'var(--status-danger)', fontWeight: 600 }}>
                    {w.active_activities} active tasks
                  </span> (capacity threshold: {OVERALLOC_THRESHOLD})
                </div>
              ))}
            </div>
            <div className="text-xs text-muted" style={{ marginTop: '0.35rem' }}>
              Consider redistributing tasks or adjusting the schedule to prevent burnout and quality degradation.
            </div>
          </div>
        </div>
      )}

      {/* Capacity KPI Cards */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="metric-card info">
          <div className="metric-label">Team Members</div>
          <div className="metric-value info">{workload.length}</div>
        </div>
        <div className="metric-card success">
          <div className="metric-label">Avg. Utilization</div>
          <div className="metric-value success">
            {workload.length > 0 ? Math.round(workload.reduce((s, w) => s + (w.total_activities > 0 ? (w.completed_activities / w.total_activities * 100) : 0), 0) / workload.length) : 0}%
          </div>
        </div>
        <div className={`metric-card ${overAllocated.length > 0 ? 'danger' : 'success'}`}>
          <div className="metric-label">Over-Allocated</div>
          <div className={`metric-value ${overAllocated.length > 0 ? 'danger' : 'success'}`}>{overAllocated.length}</div>
        </div>
        <div className="metric-card neutral">
          <div className="metric-label">Total Activities</div>
          <div className="metric-value">{workload.reduce((s, w) => s + w.total_activities, 0)}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card-header"><div className="card-title">Activities per Team Member</div></div>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={{ background: '#0b1010', border: '1px solid rgba(148,200,187,0.16)', borderRadius: 8, fontSize: 12 }} />
              <Legend />
              <Bar dataKey="Completed" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Active" stackId="a" fill="#22d3ee" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Team Member</th>
                <th>Role</th>
                <th>Total</th>
                <th>Active</th>
                <th>Completed</th>
                <th>Status</th>
                <th>Utilization</th>
              </tr>
            </thead>
            <tbody>
              {workload.map(w => {
                const util = w.total_activities > 0 ? ((w.active_activities + w.completed_activities) / w.total_activities * 100) : 0;
                const isOverAlloc = w.active_activities >= OVERALLOC_THRESHOLD;
                return (
                  <tr key={w.id} style={isOverAlloc ? { background: 'rgba(239,68,68,0.04)' } : {}}>
                    <td>
                      <div className="flex items-center gap-sm">
                        <strong>{w.name}</strong>
                        {isOverAlloc && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem',
                            fontWeight: 700, background: '#fef2f2', color: '#dc2626',
                            border: '1px solid #fecaca', animation: 'pulse 2s infinite',
                          }}>
                            <AlertTriangle size={10} /> OVER-ALLOCATED
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-sm">{w.role}</td>
                    <td className="text-center">{w.total_activities}</td>
                    <td className="text-center">
                      <span className={`badge ${isOverAlloc ? 'badge-danger' : 'badge-info'}`} style={isOverAlloc ? { animation: 'pulse 2s infinite' } : {}}>
                        {w.active_activities}
                      </span>
                    </td>
                    <td className="text-center"><span className="badge badge-success">{w.completed_activities}</span></td>
                    <td>
                      {isOverAlloc ? (
                        <span className="badge badge-danger">Over-Allocated</span>
                      ) : w.active_activities > 0 ? (
                        <span className="badge badge-info">Active</span>
                      ) : (
                        <span className="badge badge-success">Available</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-sm">
                        <div className="progress-bar" style={{ flex: 1, maxWidth: 100 }}>
                          <div className={`progress-fill ${isOverAlloc ? 'danger' : util > 80 ? 'warning' : ''}`} style={{ width: `${Math.min(util, 100)}%` }} />
                        </div>
                        <span className="text-xs font-mono">{util.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
