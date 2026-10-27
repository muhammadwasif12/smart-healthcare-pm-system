import { useState, useEffect } from 'react';
import { getEVM, getEVMTrend } from '../services/api';
import { useAppContext } from '../App';
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, Target, ArrowRight } from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadialBarChart, RadialBar } from 'recharts';

export default function EVMPage() {
  const [evm, setEvm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState([]);
  const { statusDate } = useAppContext();

  useEffect(() => {
    setLoading(true);
    Promise.all([getEVM(statusDate), getEVMTrend()])
      .then(([d, t]) => { setEvm(d); setTrend(t); setLoading(false); })
      .catch(() => setLoading(false));
  }, [statusDate]);

  if (loading || !evm) return <div className="loading-spinner"><div className="spinner" /></div>;

  const fmt = (v) => v != null ? `₨ ${Math.round(v).toLocaleString()}` : '—';
  const fmtM = (v) => v != null ? `₨ ${(v / 1000000).toFixed(2)}M` : '—';
  const pct = (v) => v != null ? `${(v * 100).toFixed(1)}%` : '—';

  const variances = [
    { name: 'PV', value: Math.round(evm.PV / 1000), fill: '#22d3ee' },
    { name: 'EV', value: Math.round(evm.EV / 1000), fill: '#34d399' },
    { name: 'AC', value: Math.round(evm.AC / 1000), fill: '#ef4444' },
  ];

  const gaugeData = [
    { name: 'CPI', value: Math.min(evm.CPI * 100, 150), fill: evm.CPI >= 1 ? '#22c55e' : evm.CPI >= 0.9 ? '#f59e0b' : '#ef4444' },
    { name: 'SPI', value: Math.min(evm.SPI * 100, 150), fill: evm.SPI >= 1 ? '#22c55e' : evm.SPI >= 0.9 ? '#f59e0b' : '#ef4444' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><TrendingUp size={24} /> Earned Value Management</h2>
          <p className="page-subtitle">Status Date: {statusDate} • All values computed from database</p>
        </div>
      </div>

      {evm.alerts?.map((alert, index) => (
        <div key={index} className={`alert alert-${alert.level === 'critical' ? 'danger' : 'warning'}`} style={{ marginBottom: 'var(--space-sm)' }}>
          <AlertTriangle size={16} />
          <span>{alert.message}</span>
        </div>
      ))}

      {/* Performance Indices */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-xl)' }}>
        <MetricBox label="CPI" value={evm.CPI?.toFixed(3)} status={evm.CPI >= 1 ? 'success' : evm.CPI >= 0.9 ? 'warning' : 'danger'} desc={evm.CPI < 1 ? 'Over Budget' : 'Under Budget'} icon={<DollarSign size={16} />} />
        <MetricBox label="SPI" value={evm.SPI?.toFixed(3)} status={evm.SPI >= 1 ? 'success' : evm.SPI >= 0.9 ? 'warning' : 'danger'} desc={evm.SPI < 1 ? 'Behind Schedule' : 'Ahead'} icon={<Target size={16} />} />
        <MetricBox label="TCPI" value={evm.TCPI?.toFixed(3)} status={evm.TCPI > 1.2 ? 'danger' : evm.TCPI > 1 ? 'warning' : 'success'} desc={evm.TCPI > 1 ? 'Must improve' : 'On track'} icon={<TrendingUp size={16} />} />
        <MetricBox label="VAC" value={fmtM(evm.VAC)} status={evm.VAC >= 0 ? 'success' : 'danger'} desc="Variance at Completion" icon={<AlertTriangle size={16} />} />
      </div>

      {/* Main EVM Table + Bar Chart */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">EVM Summary Table</div>
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>Metric</th><th>Formula</th><th>Value</th><th>Status</th></tr></thead>
              <tbody>
                <EVMRow label="BAC" formula="Σ Estimated Cost" value={fmt(evm.BAC)} status="info" />
                <EVMRow label="PV" formula="Prorated planned cost" value={fmt(evm.PV)} status="info" />
                <EVMRow label="EV" formula="Σ (%complete × cost)" value={fmt(evm.EV)} status="info" />
                <EVMRow label="AC" formula="Σ Expenses" value={fmt(evm.AC)} status="info" />
                <EVMRow label="CV" formula="EV − AC" value={fmt(evm.CV)} status={evm.CV >= 0 ? 'success' : 'danger'} />
                <EVMRow label="SV" formula="EV − PV" value={fmt(evm.SV)} status={evm.SV >= 0 ? 'success' : 'danger'} />
                <EVMRow label="CPI" formula="EV ÷ AC" value={evm.CPI?.toFixed(4)} status={evm.CPI >= 1 ? 'success' : 'danger'} />
                <EVMRow label="SPI" formula="EV ÷ PV" value={evm.SPI?.toFixed(4)} status={evm.SPI >= 1 ? 'success' : 'danger'} />
                <EVMRow label="EAC" formula="BAC ÷ CPI" value={fmt(evm.EAC)} status={evm.EAC <= evm.BAC ? 'success' : 'danger'} />
                <EVMRow label="ETC" formula="EAC − AC" value={fmt(evm.ETC)} status="info" />
                <EVMRow label="VAC" formula="BAC − EAC" value={fmt(evm.VAC)} status={evm.VAC >= 0 ? 'success' : 'danger'} />
                <EVMRow label="TCPI" formula="(BAC−EV) ÷ (BAC−AC)" value={evm.TCPI?.toFixed(4)} status={evm.TCPI <= 1 ? 'success' : 'warning'} />
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="card-header">
            <div className="card-title">EVM Trend by Status Date</div>
            <span className="text-xs text-muted">PKR values; indices calculated from dated history</span>
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>Date</th><th>PV</th><th>EV</th><th>AC</th><th>CPI</th><th>SPI</th><th>TCPI</th></tr></thead>
              <tbody>
                {trend.map(row => (
                  <tr key={row.date}>
                    <td className="font-mono text-xs">{row.date}</td>
                    <td>{fmt(row.PV)}</td>
                    <td>{fmt(row.EV)}</td>
                    <td>{fmt(row.AC)}</td>
                    <td>{row.CPI != null ? row.CPI.toFixed(3) : '—'}</td>
                    <td>{row.SPI != null ? row.SPI.toFixed(3) : '—'}</td>
                    <td>{row.TCPI != null ? row.TCPI.toFixed(3) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">PV vs EV vs AC</div>
            <span className="text-xs text-muted">in thousands (₨K)</span>
          </div>
          <div style={{ height: 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={variances} margin={{ top: 20, right: 20, bottom: 5, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `${v}K`} />
                <Tooltip contentStyle={{ background: '#0b1010', border: '1px solid rgba(148,200,187,0.16)', borderRadius: 8, fontSize: 12 }} formatter={v => `₨${v}K`} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {variances.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Forecasting */}
      <div className="card">
        <div className="card-header">
          <div className="card-title"><ArrowRight size={18} /> Forecasting & Analysis</div>
        </div>
        <div className="grid-3">
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Budget Forecast</h4>
            <p className="text-sm text-secondary">
              At current CPI of {evm.CPI?.toFixed(2)}, the project is forecast to cost <strong style={{ color: 'var(--status-danger)' }}>{fmtM(evm.EAC)}</strong> — which is{' '}
              <strong style={{ color: 'var(--status-danger)' }}>{fmtM(Math.abs(evm.VAC))}</strong> {evm.VAC < 0 ? 'over' : 'under'} the approved budget of {fmtM(evm.BAC)}.
            </p>
            <p className="text-sm text-secondary mt-md">
              Remaining work will cost an estimated <strong>{fmtM(evm.ETC)}</strong>.
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Schedule Forecast</h4>
            <p className="text-sm text-secondary">
              At SPI of {evm.SPI?.toFixed(2)}, the team is completing only <strong>{pct(evm.SPI)}</strong> of planned work per period. This indicates {evm.SPI < 0.9 ? 'significant schedule slippage' : evm.SPI < 1 ? 'minor delays' : 'good schedule performance'}.
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Recovery Target (TCPI)</h4>
            <p className="text-sm text-secondary">
              To finish within budget, the team must achieve a CPI of <strong style={{ color: evm.TCPI > 1.2 ? 'var(--status-danger)' : 'var(--status-warning)' }}>{evm.TCPI?.toFixed(2)}</strong> for all remaining work. {evm.TCPI > 1.2 ? 'This is extremely challenging and may require scope/budget adjustment.' : 'This is achievable with better resource allocation.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricBox({ label, value, status, desc, icon }) {
  return (
    <div className={`metric-card ${status}`}>
      <div className="flex items-center gap-sm" style={{ marginBottom: '0.5rem' }}>
        <span style={{ color: `var(--status-${status})`, opacity: 0.8 }}>{icon}</span>
        <span className="metric-label" style={{ marginBottom: 0 }}>{label}</span>
      </div>
      <div className={`metric-value ${status}`}>{value}</div>
      <div className="metric-subtitle">{desc}</div>
    </div>
  );
}

function EVMRow({ label, formula, value, status }) {
  return (
    <tr>
      <td><strong className="font-mono">{label}</strong></td>
      <td className="text-xs text-muted">{formula}</td>
      <td className="font-mono" style={{ fontWeight: 600 }}>{value}</td>
      <td><span className={`badge badge-${status}`}>{status === 'success' ? '✓' : status === 'danger' ? '✗' : '—'}</span></td>
    </tr>
  );
}
