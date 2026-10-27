import { useState, useEffect } from 'react';
import { getRisks } from '../services/api';
import { AlertTriangle, Shield } from 'lucide-react';

export default function RisksPage() {
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRisks().then(r => { setRisks(r); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const scoreClass = (s) => s >= 15 ? 'danger' : s >= 10 ? 'warning' : s >= 5 ? 'info' : 'success';
  const scoreLabel = (s) => s >= 15 ? 'Critical' : s >= 10 ? 'High' : s >= 5 ? 'Medium' : 'Low';

  // Build 5x5 risk matrix
  const matrix = [];
  for (let impact = 5; impact >= 1; impact--) {
    const row = [];
    for (let likelihood = 1; likelihood <= 5; likelihood++) {
      const score = likelihood * impact;
      const risksInCell = risks.filter(r => r.likelihood === likelihood && r.impact === impact);
      row.push({ likelihood, impact, score, risks: risksInCell });
    }
    matrix.push(row);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><AlertTriangle size={24} /> Risk Register</h2>
          <p className="page-subtitle">{risks.length} risks identified • Score = Likelihood × Impact</p>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 'var(--space-xl)' }}>
        {/* Risk Matrix */}
        <div className="card">
          <div className="card-header"><div className="card-title"><Shield size={18} /> Risk Matrix (L × I)</div></div>
          <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(5, 1fr)', gap: 3 }}>
            {/* Y-axis label */}
            <div style={{ gridColumn: '1', gridRow: '1/7', display: 'flex', alignItems: 'center', justifyContent: 'center', writingMode: 'vertical-lr', transform: 'rotate(180deg)', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>IMPACT →</div>
            {matrix.map((row, ri) => row.map((cell, ci) => (
              <div key={`${ri}-${ci}`} className={`risk-cell risk-${cell.score >= 15 ? 'critical' : cell.score >= 10 ? 'high' : cell.score >= 5 ? 'medium' : 'low'}`}
                style={{ gridColumn: ci + 2, gridRow: ri + 1, aspectRatio: '1', minHeight: 50, flexDirection: 'column', gap: 2 }}
                title={`L=${cell.likelihood} × I=${cell.impact} = ${cell.score}`}>
                <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>{cell.score}</span>
                {cell.risks.map(r => <span key={r.id} style={{ fontSize: '0.6rem', fontWeight: 700 }}>{r.code}</span>)}
              </div>
            )))}
            {/* X-axis labels */}
            <div style={{ gridColumn: '1', gridRow: '7' }} />
            {[1, 2, 3, 4, 5].map(l => (
              <div key={l} style={{ gridColumn: l + 1, gridRow: 7, textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', paddingTop: 4 }}>{l}</div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 4, fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>LIKELIHOOD →</div>
        </div>

        {/* Risk Summary */}
        <div className="card">
          <div className="card-header"><div className="card-title">Risk Summary</div></div>
          <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 'var(--space-md)' }}>
            <div className="metric-card danger"><div className="metric-label">Critical</div><div className="metric-value danger">{risks.filter(r => r.score >= 15).length}</div></div>
            <div className="metric-card warning"><div className="metric-label">High</div><div className="metric-value warning">{risks.filter(r => r.score >= 10 && r.score < 15).length}</div></div>
            <div className="metric-card"><div className="metric-label">Medium</div><div className="metric-value info">{risks.filter(r => r.score >= 5 && r.score < 10).length}</div></div>
            <div className="metric-card success"><div className="metric-label">Low</div><div className="metric-value success">{risks.filter(r => r.score < 5).length}</div></div>
          </div>
        </div>
      </div>

      {/* Risk Table */}
      <div className="card">
        <div className="card-header"><div className="card-title">All Risks</div></div>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Code</th><th>Risk</th><th>Category</th><th>L</th><th>I</th><th>Score</th><th>Level</th><th>Mitigation</th><th>Owner</th><th>Status</th></tr>
            </thead>
            <tbody>
              {risks.sort((a, b) => b.score - a.score).map(r => (
                <tr key={r.id}>
                  <td className="font-mono text-xs">{r.code}</td>
                  <td style={{ maxWidth: 180 }} className="truncate">{r.title}</td>
                  <td><span className="badge badge-neutral">{r.category}</span></td>
                  <td className="text-center">{r.likelihood}</td>
                  <td className="text-center">{r.impact}</td>
                  <td className="text-center"><span className={`badge badge-${scoreClass(r.score)}`}>{r.score}</span></td>
                  <td><span className={`badge badge-${scoreClass(r.score)}`}>{scoreLabel(r.score)}</span></td>
                  <td className="text-sm truncate" style={{ maxWidth: 200 }}>{r.mitigation || '—'}</td>
                  <td className="text-sm">{r.owner || '—'}</td>
                  <td><span className={`badge ${r.status === 'Active' ? 'badge-warning' : r.status === 'Mitigated' ? 'badge-success' : 'badge-neutral'}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
