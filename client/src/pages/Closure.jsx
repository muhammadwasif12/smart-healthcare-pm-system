import { useState, useEffect } from 'react';
import { getClosure, updateClosure, getDefects, getRequirements } from '../services/api';
import { Archive, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ClosurePage() {
  const [closure, setClosure] = useState(null);
  const [gate, setGate] = useState({ critHigh: 0, notImpl: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getClosure(), getDefects(), getRequirements()])
      .then(([c, defects, reqs]) => {
        setClosure(c);
        const critHigh = defects.filter(d => (d.severity === 'Critical' || d.severity === 'High') && d.status !== 'Closed' && d.status !== 'Verified').length;
        const notImpl = reqs.filter(r => r.status === 'Approved').length;
        setGate({ critHigh, notImpl });
        setLoading(false);
      }).catch(() => setLoading(false));
  }, []);

  const canSignOff = gate.critHigh === 0 && gate.notImpl === 0;

  const handleSignOff = async () => {
    if (!canSignOff) { toast.error('Gate conditions not met'); return; }
    try {
      await updateClosure({ status: 'Signed Off', sign_off_date: new Date().toISOString().slice(0, 10) });
      toast.success('Project signed off!');
      const c = await getClosure();
      setClosure(c);
    } catch (e) { toast.error(e.response?.data?.message || 'Sign off failed'); }
  };

  if (loading || !closure) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title"><Archive size={24} /> Project Closure</h2>
      </div>

      {/* Gate Conditions */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card-header"><div className="card-title">Closure Gate Conditions</div></div>
        <div className="grid-2">
          <div className={`alert ${gate.critHigh === 0 ? 'alert-success' : 'alert-danger'}`}>
            {gate.critHigh === 0 ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            <div>
              <strong>{gate.critHigh === 0 ? 'PASS' : 'FAIL'}: Critical/High Defects</strong>
              <p className="text-sm">{gate.critHigh === 0 ? 'All critical and high defects are closed.' : `${gate.critHigh} open critical/high defect(s) remaining.`}</p>
            </div>
          </div>
          <div className={`alert ${gate.notImpl === 0 ? 'alert-success' : 'alert-danger'}`}>
            {gate.notImpl === 0 ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            <div>
              <strong>{gate.notImpl === 0 ? 'PASS' : 'FAIL'}: Requirements Implementation</strong>
              <p className="text-sm">{gate.notImpl === 0 ? 'All approved requirements are implemented.' : `${gate.notImpl} approved requirement(s) not yet implemented.`}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Closure Details */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="card-title">Closure Summary</div></div>
          <div className="form-group"><div className="form-label">Status</div><span className={`badge ${closure.status === 'Signed Off' ? 'badge-success' : 'badge-warning'}`}>{closure.status}</span></div>
          <div className="form-group"><div className="form-label">Planned End Date</div><div className="font-mono">{closure.planned_end_date || '—'}</div></div>
          <div className="form-group"><div className="form-label">Actual End Date</div><div className="font-mono">{closure.actual_end_date || 'Not yet'}</div></div>
          <div className="form-group"><div className="form-label">Final Cost</div><div className="font-mono">₨{closure.final_cost ? closure.final_cost.toLocaleString() : '—'}</div></div>
          {closure.sign_off_date && <div className="form-group"><div className="form-label">Signed Off</div><div className="font-mono">{closure.sign_off_date}</div></div>}
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Lessons Learned</div></div>
          <p className="text-sm text-secondary" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{closure.lessons_learned || 'No lessons learned documented yet.'}</p>
          {closure.status !== 'Signed Off' && (
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <button className="btn btn-primary w-full" onClick={handleSignOff} disabled={!canSignOff}>
                {canSignOff ? 'Sign Off Project' : 'Gate Conditions Not Met'}
              </button>
              {!canSignOff && <p className="text-xs text-muted mt-md text-center">Resolve all gate conditions before signing off.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
