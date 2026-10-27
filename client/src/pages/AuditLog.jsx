import { useState, useEffect } from 'react';
import { getAuditLog } from '../services/api';
import { Settings, Filter } from 'lucide-react';

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    getAuditLog(filter || undefined).then(l => { setLogs(l); setLoading(false); }).catch(() => setLoading(false));
  }, [filter]);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const entityTypes = [...new Set(logs.map(l => l.entity_type))];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title"><Settings size={24} /> Audit Log</h2>
        <select className="form-select" value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 200 }}>
          <option value="">All Entities</option>
          {entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>Timestamp</th><th>Action</th><th>Entity</th><th>Entity ID</th><th>Details</th></tr></thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan="5" className="text-center text-muted" style={{ padding: 'var(--space-xl)' }}>No audit log entries</td></tr>
              ) : logs.map(l => (
                <tr key={l.id}>
                  <td className="font-mono text-xs">{l.created_at}</td>
                  <td><span className={`badge ${l.action === 'CREATE' ? 'badge-success' : l.action === 'UPDATE' ? 'badge-info' : l.action === 'DELETE' ? 'badge-danger' : 'badge-neutral'}`}>{l.action}</span></td>
                  <td className="text-sm">{l.entity_type}</td>
                  <td className="font-mono text-xs">{l.entity_id}</td>
                  <td className="text-xs text-muted truncate" style={{ maxWidth: 300 }}>{l.details || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
