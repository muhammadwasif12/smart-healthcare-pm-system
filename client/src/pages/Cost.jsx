import { useState, useEffect } from 'react';
import { getExpenses, getActivities } from '../services/api';
import { useAppContext } from '../App';
import { DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function CostPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const { statusDate } = useAppContext();

  useEffect(() => {
    setLoading(true);
    getActivities().then(a => { setActivities(a); setLoading(false); }).catch(() => setLoading(false));
  }, [statusDate]);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const totalBudget = activities.reduce((s, a) => s + a.estimated_cost, 0);
  const totalAC = activities.reduce((s, a) => s + (a.actual_cost || 0), 0);
  const totalEV = activities.reduce((s, a) => s + (a.percent_complete / 100) * a.estimated_cost, 0);

  const chartData = activities.filter(a => a.estimated_cost > 50000).map(a => ({
    name: a.code,
    Budget: Math.round(a.estimated_cost / 1000),
    Actual: Math.round((a.actual_cost || 0) / 1000),
    Earned: Math.round((a.percent_complete / 100) * a.estimated_cost / 1000),
  }));

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title"><DollarSign size={24} /> Cost Tracking</h2>
      </div>

      <div className="metrics-grid" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="metric-card"><div className="metric-label">Total Budget (BAC)</div><div className="metric-value info">₨{(totalBudget / 1e6).toFixed(2)}M</div></div>
        <div className={`metric-card ${totalAC > totalEV ? 'danger' : 'success'}`}>
          <div className="metric-label">Actual Cost</div><div className={`metric-value ${totalAC > totalEV ? 'danger' : 'success'}`}>₨{(totalAC / 1e6).toFixed(2)}M</div>
        </div>
        <div className="metric-card"><div className="metric-label">Earned Value</div><div className="metric-value info">₨{(totalEV / 1e6).toFixed(2)}M</div></div>
        <div className={`metric-card ${totalAC - totalEV > 0 ? 'danger' : 'success'}`}>
          <div className="metric-label">Cost Variance</div>
          <div className={`metric-value ${totalEV - totalAC < 0 ? 'danger' : 'success'}`}>₨{((totalEV - totalAC) / 1000).toFixed(0)}K</div>
          <div className="metric-subtitle">{totalEV - totalAC < 0 ? 'Over budget' : 'Under budget'}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card-header"><div className="card-title">Budget vs Actual by Activity</div></div>
        <div style={{ height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `${v}K`} />
              <Tooltip contentStyle={{ background: '#0b1010', border: '1px solid rgba(148,200,187,0.16)', borderRadius: 8, fontSize: 12 }} formatter={v => `₨${v}K`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Budget" fill="#22d3ee" radius={[4, 4, 0, 0]} opacity={0.6} />
              <Bar dataKey="Actual" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Earned" fill="#22c55e" radius={[4, 4, 0, 0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Cost Details by Activity</div></div>
        <div className="table-container">
          <table>
            <thead><tr><th>Code</th><th>Activity</th><th>Budget</th><th>Actual</th><th>Variance</th><th>% Spent</th></tr></thead>
            <tbody>
              {activities.filter(a => a.estimated_cost > 0).map(a => {
                const variance = a.estimated_cost - (a.actual_cost || 0);
                const pctSpent = a.estimated_cost > 0 ? ((a.actual_cost || 0) / a.estimated_cost * 100) : 0;
                return (
                  <tr key={a.id}>
                    <td className="font-mono text-xs">{a.code}</td>
                    <td className="truncate" style={{ maxWidth: 200 }}>{a.name}</td>
                    <td className="font-mono text-right">₨{(a.estimated_cost / 1000).toFixed(0)}K</td>
                    <td className="font-mono text-right">₨{((a.actual_cost || 0) / 1000).toFixed(0)}K</td>
                    <td className="font-mono text-right" style={{ color: variance < 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>
                      {variance >= 0 ? '+' : ''}₨{(variance / 1000).toFixed(0)}K
                    </td>
                    <td>
                      <div className="flex items-center gap-sm">
                        <div className="progress-bar" style={{ flex: 1, maxWidth: 80 }}>
                          <div className={`progress-fill ${pctSpent > 100 ? 'danger' : pctSpent > 80 ? 'warning' : ''}`} style={{ width: `${Math.min(pctSpent, 100)}%` }} />
                        </div>
                        <span className="text-xs font-mono">{pctSpent.toFixed(0)}%</span>
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
