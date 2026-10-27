import { useState, useEffect } from 'react';
import { getDefects, updateDefect } from '../services/api';
import { Bug, Filter } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function DefectsPage() {
  const [defects, setDefects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = () => {
    setLoading(true);
    getDefects().then(d => { setDefects(d); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateDefect(id, { status: newStatus });
      setDefects(defects.map(d => d.id === id ? { ...d, status: newStatus } : d));
      toast.success(`Defect ${newStatus.toLowerCase()}`);
    } catch { toast.error('Update failed'); }
  };

  const filtered = filter === 'all' ? defects : defects.filter(d => d.severity === filter);

  const severityData = ['Critical', 'High', 'Medium', 'Low'].map(s => ({
    name: s, value: defects.filter(d => d.severity === s).length,
    color: s === 'Critical' ? '#ef4444' : s === 'High' ? '#f59e0b' : s === 'Medium' ? '#3b82f6' : '#22c55e'
  })).filter(d => d.value > 0);

  const statusData = ['Open', 'In Progress', 'Fixed', 'Verified', 'Closed'].map(s => ({
    name: s, value: defects.filter(d => d.status === s).length,
  })).filter(d => d.value > 0);

  const sevBadge = (s) => {
    const map = { Critical: 'badge-danger', High: 'badge-warning', Medium: 'badge-info', Low: 'badge-success' };
    return <span className={`badge ${map[s]}`}>{s}</span>;
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><Bug size={24} /> Defect Tracker</h2>
          <p className="page-subtitle">{defects.length} defects • {defects.filter(d => d.status === 'Open').length} open</p>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card">
          <div className="card-header"><div className="card-title">By Severity</div></div>
          <div style={{ height: 230, padding: '8px 0 4px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={severityData} cx="50%" cy="54%" innerRadius={50} outerRadius={72} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {severityData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0b1010', border: '1px solid rgba(148,200,187,0.16)', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">By Status</div></div>
          <div style={{ height: 230, padding: '8px 0 4px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ background: '#0b1010', border: '1px solid rgba(148,200,187,0.16)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="tabs" style={{ maxWidth: 500 }}>
        {['all', 'Critical', 'High', 'Medium', 'Low'].map(s => (
          <button key={s} className={`tab ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
            {s === 'all' ? 'All' : s} ({s === 'all' ? defects.length : defects.filter(d => d.severity === s).length})
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Code</th><th>Title</th><th>Severity</th><th>Activity</th><th>Reported</th><th>Assigned</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id}>
                  <td className="font-mono text-xs">{d.code}</td>
                  <td style={{ maxWidth: 200 }} className="truncate">{d.title}</td>
                  <td>{sevBadge(d.severity)}</td>
                  <td className="text-xs text-muted">{d.activity_code || '—'}</td>
                  <td className="font-mono text-xs">{d.reported_date}</td>
                  <td className="text-sm">{d.assigned_to || '—'}</td>
                  <td>
                    <span className={`badge ${d.status === 'Open' ? 'badge-danger' : d.status === 'Fixed' || d.status === 'Closed' || d.status === 'Verified' ? 'badge-success' : 'badge-info'}`}>
                      {d.status}
                    </span>
                  </td>
                  <td>
                    {d.status === 'Open' && <button className="btn btn-ghost btn-sm" onClick={() => handleStatusChange(d.id, 'In Progress')}>Start</button>}
                    {d.status === 'In Progress' && <button className="btn btn-ghost btn-sm" onClick={() => handleStatusChange(d.id, 'Fixed')}>Fix</button>}
                    {d.status === 'Fixed' && <button className="btn btn-ghost btn-sm" onClick={() => handleStatusChange(d.id, 'Verified')}>Verify</button>}
                    {d.status === 'Verified' && <button className="btn btn-ghost btn-sm" onClick={() => handleStatusChange(d.id, 'Closed')}>Close</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
