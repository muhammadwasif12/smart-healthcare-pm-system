import { useState, useEffect } from 'react';
import { getChecklists, recordInspection } from '../services/api';
import { CheckSquare, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ChecklistsPage() {
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getChecklists().then(c => { setChecklists(c); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  const handleInspect = async (checklistId, itemId, result) => {
    try {
      await recordInspection(checklistId, itemId, { result, inspector: 'QA Team', inspection_date: new Date().toISOString().slice(0, 10) });
      toast.success(`Item marked as ${result}`);
      load();
    } catch { toast.error('Failed to record'); }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title"><CheckSquare size={24} /> Quality Checklists</h2>
      </div>
      <div className="grid-2">
        {checklists.map(cl => {
          const items = cl.items || [];
          const passed = items.filter(i => i.result === 'Pass').length;
          const failed = items.filter(i => i.result === 'Fail').length;
          const tested = passed + failed;
          const passRate = tested > 0 ? (passed / tested * 100).toFixed(0) : '—';

          return (
            <div className="card" key={cl.id}>
              <div className="card-header">
                <div className="card-title"><CheckSquare size={16} /> {cl.name}</div>
                <span className={`badge ${passRate !== '—' && passRate >= 80 ? 'badge-success' : passRate !== '—' && passRate >= 50 ? 'badge-warning' : 'badge-neutral'}`}>
                  {passRate}% pass rate
                </span>
              </div>
              <p className="text-xs text-muted mb-md">{cl.phase} • {cl.wbs_code}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-sm" style={{ padding: '6px 8px', borderRadius: 6, background: item.result === 'Pass' ? 'rgba(34,197,94,0.06)' : item.result === 'Fail' ? 'rgba(239,68,68,0.06)' : 'transparent', border: '1px solid var(--border-glass)' }}>
                    {item.result === 'Pass' ? <CheckCircle2 size={16} color="#22c55e" /> : item.result === 'Fail' ? <XCircle size={16} color="#ef4444" /> : <MinusCircle size={16} color="#64748b" />}
                    <span className="text-sm" style={{ flex: 1 }}>{item.check_item}</span>
                    {!item.result && (
                      <div className="flex gap-sm">
                        <button className="btn btn-success btn-sm" onClick={() => handleInspect(cl.id, item.id, 'Pass')} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>Pass</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleInspect(cl.id, item.id, 'Fail')} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>Fail</button>
                      </div>
                    )}
                    {item.result && <span className={`badge ${item.result === 'Pass' ? 'badge-success' : 'badge-danger'}`}>{item.result}</span>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
