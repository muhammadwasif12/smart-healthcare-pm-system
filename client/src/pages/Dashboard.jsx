import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard } from '../services/api';
import { useAppContext } from '../App';
import {
  TrendingUp, TrendingDown, AlertTriangle, DollarSign, CalendarDays,
  Bug, GitBranch, CheckCircle2, Clock, Activity, Target, Shield
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { statusDate } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    getDashboard(statusDate).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [statusDate]);

  if (loading || !data) return <div className="loading-spinner"><div className="spinner" /></div>;

  const { evm, charter, counts, alerts, topRisks, upcomingMilestones, overallProgress, health, daysRemaining, budget } = data;

  const healthColor = health === 'On Track' ? 'success' : health === 'At Risk' ? 'warning' : 'danger';

  const formatPKR = (v) => v != null ? `₨ ${(v / 1000000).toFixed(2)}M` : '—';
  const formatNum = (v) => v != null ? v.toLocaleString() : '—';

  const activityStatusData = [
    { name: 'Completed', value: counts.completedActivities, color: '#22c55e' },
    { name: 'In Progress', value: counts.totalActivities - counts.completedActivities - counts.delayedActivities, color: '#14b8a6' },
    { name: 'Delayed', value: counts.delayedActivities, color: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <div>
      {/* Health Status Banner */}
      <div className={`alert alert-${healthColor}`} style={{ marginBottom: 'var(--space-lg)' }}>
        <Shield size={20} />
        <div>
          <strong>Project Health: {health}</strong>
          <span style={{ marginLeft: '1rem', opacity: 0.8 }}>
            {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Past deadline'} • Status Date: {statusDate}
          </span>
        </div>
      </div>

      {/* EVM Alerts */}
      {alerts && alerts.map((a, i) => (
        <div key={i} className={`alert alert-${a.level === 'critical' ? 'danger' : 'warning'}`}>
          <AlertTriangle size={16} />
          <span>{a.message}</span>
        </div>
      ))}

      {/* Top Metrics Row */}
      <div className="metrics-grid" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className={`metric-card ${evm.CPI < 0.9 ? 'danger' : 'success'}`} onClick={() => navigate('/evm')} style={{ cursor: 'pointer' }}>
          <div className="metric-label">CPI (Cost)</div>
          <div className={`metric-value ${evm.CPI < 0.9 ? 'danger' : 'success'}`}>{evm.CPI?.toFixed(2) || '—'}</div>
          <div className="metric-subtitle">{evm.CPI < 1 ? 'Over Budget' : 'Under Budget'}</div>
        </div>
        <div className={`metric-card ${evm.SPI < 0.9 ? 'danger' : 'success'}`} onClick={() => navigate('/evm')} style={{ cursor: 'pointer' }}>
          <div className="metric-label">SPI (Schedule)</div>
          <div className={`metric-value ${evm.SPI < 0.9 ? 'danger' : 'success'}`}>{evm.SPI?.toFixed(2) || '—'}</div>
          <div className="metric-subtitle">{evm.SPI < 1 ? 'Behind Schedule' : 'Ahead'}</div>
        </div>
        <div className="metric-card" onClick={() => navigate('/cost')} style={{ cursor: 'pointer' }}>
          <div className="metric-label">Budget Spent</div>
          <div className="metric-value info">{formatPKR(evm.AC)}</div>
          <div className="metric-subtitle">of {formatPKR(budget.approved)} approved</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Overall Progress</div>
          <div className="metric-value info">{overallProgress}%</div>
          <div className="progress-bar" style={{ marginTop: '8px' }}>
            <div className={`progress-fill ${overallProgress > 70 ? 'success' : ''}`} style={{ width: `${overallProgress}%` }} />
          </div>
        </div>
        <div className={`metric-card ${counts.criticalDefects > 0 ? 'danger' : ''}`} onClick={() => navigate('/defects')} style={{ cursor: 'pointer' }}>
          <div className="metric-label">Critical Defects</div>
          <div className={`metric-value ${counts.criticalDefects > 0 ? 'danger' : 'success'}`}>{counts.criticalDefects}</div>
          <div className="metric-subtitle">{counts.highDefects} high severity</div>
        </div>
        <div className={`metric-card ${(counts.delayedItems || 0) > 0 ? 'danger' : 'neutral'}`} onClick={() => navigate('/milestones')} style={{ cursor: 'pointer' }}>
          <div className="metric-label">Delayed Items</div>
          <div className={`metric-value ${(counts.delayedItems || 0) > 0 ? 'danger' : 'success'}`}>{counts.delayedItems || 0}</div>
          <div className="metric-subtitle">{counts.delayedMilestones || 0} milestones • {counts.delayedActivities || 0} activities</div>
        </div>
        <div className="metric-card" onClick={() => navigate('/change-requests')} style={{ cursor: 'pointer' }}>
          <div className="metric-label">Pending CRs</div>
          <div className="metric-value warning">{counts.pendingChangeRequests}</div>
          <div className="metric-subtitle">awaiting decision</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-xl)' }}>
        {/* EVM S-Curve */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><TrendingUp size={18} /> Earned Value Trend</div>
          </div>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { date: 'W1', PV: 360, EV: 360, AC: 391 },
                { date: 'W4', PV: 990, EV: 960, AC: 1079 },
                { date: 'W6', PV: 2600, EV: 2366, AC: 2719 },
                { date: 'W8', PV: Math.round(evm.PV/1000), EV: Math.round(evm.EV/1000), AC: Math.round(evm.AC/1000) },
              ]} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="evGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="acGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `${v}K`} />
                <Tooltip contentStyle={{ background: '#0b1010', border: '1px solid rgba(148,200,187,0.16)', borderRadius: 8, fontSize: 12 }} formatter={v => `₨${v}K`} />
                <Area type="monotone" dataKey="PV" stroke="#22d3ee" fill="url(#pvGrad)" strokeWidth={2} name="Planned Value" />
                <Area type="monotone" dataKey="EV" stroke="#22c55e" fill="url(#evGrad)" strokeWidth={2} name="Earned Value" />
                <Area type="monotone" dataKey="AC" stroke="#ef4444" fill="url(#acGrad)" strokeWidth={2} name="Actual Cost" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Status Pie */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Activity size={18} /> Activity Status</div>
            <span className="text-sm text-muted">{counts.totalActivities} total</span>
          </div>
          <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={activityStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {activityStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0b1010', border: '1px solid rgba(148,200,187,0.16)', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid-2">
        {/* Top Risks */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><AlertTriangle size={18} /> Top Risks</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/risks')}>View All</button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Code</th><th>Risk</th><th>Score</th></tr>
              </thead>
              <tbody>
                {topRisks.map(r => (
                  <tr key={r.code}>
                    <td><span className="font-mono text-xs">{r.code}</span></td>
                    <td className="truncate" style={{ maxWidth: 200 }}>{r.title}</td>
                    <td>
                      <span className={`badge ${r.score >= 15 ? 'badge-danger' : r.score >= 10 ? 'badge-warning' : 'badge-success'}`}>
                        {r.score}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Milestones */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Target size={18} /> Upcoming Milestones</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/milestones')}>View All</button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Milestone</th><th>Planned</th><th>Status</th></tr>
              </thead>
              <tbody>
                {upcomingMilestones.map(m => {
                  const isDelayed = m.status !== 'Completed' && (m.is_delayed || m.planned_date < statusDate);
                  const daysLate = m.delay_days || Math.max(1, Math.round((new Date(statusDate + 'T00:00:00Z') - new Date(m.planned_date + 'T00:00:00Z')) / 86400000));
                  return (
                    <tr key={m.id}>
                      <td className="truncate" style={{ maxWidth: 200 }}>{m.name}</td>
                      <td className="font-mono text-xs" style={isDelayed ? { color: 'var(--status-danger)' } : {}}>{m.planned_date}</td>
                      <td>
                        {isDelayed ? (
                          <span className="badge badge-danger">Delayed ({daysLate}d)</span>
                        ) : (
                          <span className={`badge ${m.status === 'Completed' ? 'badge-success' : m.status === 'In Progress' ? 'badge-info' : 'badge-neutral'}`}>
                            {m.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
