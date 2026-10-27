import { useState, useEffect } from 'react';
import { getRequirements, updateRequirement } from '../services/api';
import { Target, Filter, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';

export default function RequirementsPage() {
  const [reqs, setReqs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getRequirements().then(r => { setReqs(r); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = filter === 'all' ? reqs : reqs.filter(r => r.status === filter);
  const counts = { all: reqs.length, Implemented: reqs.filter(r => r.status === 'Implemented').length, Approved: reqs.filter(r => r.status === 'Approved').length, Proposed: reqs.filter(r => r.status === 'Proposed').length, Rejected: reqs.filter(r => r.status === 'Rejected').length };

  const statusBadge = (s) => {
    const map = { Implemented: 'badge-success', Approved: 'badge-info', Proposed: 'badge-warning', Rejected: 'badge-danger' };
    return <span className={`badge ${map[s] || 'badge-neutral'}`}>{s}</span>;
  };
  const priorityBadge = (p) => {
    const map = { Must: 'badge-danger', Should: 'badge-warning', Could: 'badge-info', Wont: 'badge-neutral' };
    return <span className={`badge ${map[p] || 'badge-neutral'}`}>{p}</span>;
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><Target size={24} /> Requirements Traceability Matrix</h2>
          <p className="page-subtitle">{reqs.length} requirements tracked • MoSCoW prioritized</p>
        </div>
      </div>

      <div className="tabs" style={{ maxWidth: 600 }}>
        {['all', 'Implemented', 'Approved', 'Proposed', 'Rejected'].map(s => (
          <button key={s} className={`tab ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
            {s === 'all' ? 'All' : s} ({counts[s] || 0})
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Code</th><th>Title</th><th>Type</th><th>Priority</th><th>Status</th><th>CR</th></tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td className="font-mono text-xs">{r.code}</td>
                  <td>{r.title}</td>
                  <td><span className={`badge ${r.type === 'Functional' ? 'badge-primary' : 'badge-violet'}`}>{r.type}</span></td>
                  <td>{priorityBadge(r.priority)}</td>
                  <td>{statusBadge(r.status)}</td>
                  <td className="text-xs text-muted">{r.change_request_code || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
