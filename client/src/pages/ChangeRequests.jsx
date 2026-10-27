import { useState, useEffect } from 'react';
import { getChangeRequests, approveChangeRequest, rejectChangeRequest, getCharter } from '../services/api';
import { GitBranch, CheckCircle2, XCircle, Clock, ArrowRight, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ChangeRequestsPage() {
  const [crs, setCrs] = useState([]);
  const [charter, setCharter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [impactModal, setImpactModal] = useState(null); // { cr, before, after }

  const load = () => {
    setLoading(true);
    Promise.all([getChangeRequests(), getCharter()])
      .then(([c, ch]) => { setCrs(c); setCharter(ch); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, []);

  const handleApprove = async (cr) => {
    if (!confirm('Approve this CR? This will update the budget and deadline.')) return;

    // Capture "before" state
    const approvedCRs = crs.filter(c => c.status === 'Approved');
    const currentBudget = (charter?.approved_budget || 5000000) + approvedCRs.reduce((s, c) => s + (c.cost_impact || 0), 0);
    const currentDeadline = charter?.end_date || '2026-12-27';
    const currentScopeCount = 15 + approvedCRs.length; // 15 baseline + approved CRs

    // Compute "after" state
    const afterBudget = currentBudget + (cr.cost_impact || 0);
    const afterDeadlineDate = new Date(currentDeadline + 'T00:00:00Z');
    afterDeadlineDate.setDate(afterDeadlineDate.getDate() + (cr.schedule_impact_weeks || 0) * 7);
    const afterDeadline = afterDeadlineDate.toISOString().slice(0, 10);
    const afterScopeCount = currentScopeCount + 1;

    try {
      await approveChangeRequest(cr.id, { decision_date: new Date().toISOString().slice(0, 10) });

      // Show Before vs After impact modal
      setImpactModal({
        cr,
        before: { budget: currentBudget, deadline: currentDeadline, scopeCount: currentScopeCount },
        after: { budget: afterBudget, deadline: afterDeadline, scopeCount: afterScopeCount },
      });

      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Approval failed'); }
  };

  const handleReject = async (id) => {
    if (!confirm('Reject this change request?')) return;
    try {
      await rejectChangeRequest(id, { decision_date: new Date().toISOString().slice(0, 10) });
      toast.success('Change request rejected');
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Rejection failed'); }
  };

  const statusBadge = (s) => {
    const map = { Approved: 'badge-success', Rejected: 'badge-danger', Submitted: 'badge-warning', 'Under Review': 'badge-info' };
    return <span className={`badge ${map[s] || 'badge-neutral'}`}>{s}</span>;
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><GitBranch size={24} /> Change Requests</h2>
          <p className="page-subtitle">{crs.length} total • {crs.filter(c => c.status === 'Submitted').length} pending approval</p>
        </div>
      </div>

      {crs.filter(c => c.status === 'Submitted').length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 'var(--space-lg)' }}>
          <Clock size={16} />
          <span>{crs.filter(c => c.status === 'Submitted').length} change request(s) awaiting approval. Approving will update the project budget and deadline.</span>
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Code</th><th>Title</th><th>Requested By</th><th>Cost Impact</th><th>Schedule</th><th>Priority</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {crs.map(cr => (
                <tr key={cr.id}>
                  <td className="font-mono text-xs">{cr.code}</td>
                  <td style={{ maxWidth: 200 }}>{cr.title}</td>
                  <td className="text-sm">{cr.requested_by}</td>
                  <td className="font-mono text-right" style={{ color: cr.cost_impact > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>
                    {cr.cost_impact > 0 ? '+' : ''}₨{(cr.cost_impact / 1000).toFixed(0)}K
                  </td>
                  <td className="text-center">+{cr.schedule_impact_weeks}w</td>
                  <td><span className={`badge ${cr.priority === 'High' ? 'badge-danger' : cr.priority === 'Medium' ? 'badge-warning' : 'badge-neutral'}`}>{cr.priority}</span></td>
                  <td>{statusBadge(cr.status)}</td>
                  <td>
                    {cr.status === 'Submitted' && (
                      <div className="flex gap-sm">
                        <button className="btn btn-success btn-sm" onClick={() => handleApprove(cr)} title="Approve">
                          <CheckCircle2 size={14} /> Approve
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleReject(cr.id)} title="Reject">
                          <XCircle size={14} />
                        </button>
                      </div>
                    )}
                    {cr.status !== 'Submitted' && <span className="text-xs text-muted">{cr.decision_date || '—'}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CR Details Cards */}
      <div className="grid-2" style={{ marginTop: 'var(--space-xl)' }}>
        {crs.map(cr => (
          <div className="card" key={cr.id}>
            <div className="card-header">
              <div className="card-title">{cr.code}: {cr.title}</div>
              {statusBadge(cr.status)}
            </div>
            <p className="text-sm text-secondary mb-md">{cr.description || 'No description'}</p>
            <p className="text-sm text-secondary mb-md"><strong>Justification:</strong> {cr.justification || '—'}</p>
            <div className="grid-2" style={{ gap: 'var(--space-sm)' }}>
              <div className="text-xs"><span className="text-muted">Cost:</span> <strong>₨{cr.cost_impact?.toLocaleString()}</strong></div>
              <div className="text-xs"><span className="text-muted">Schedule:</span> <strong>+{cr.schedule_impact_weeks} weeks</strong></div>
              <div className="text-xs"><span className="text-muted">Requested:</span> {cr.request_date}</div>
              <div className="text-xs"><span className="text-muted">Decision:</span> {cr.decision_date || 'Pending'}</div>
            </div>
            {cr.linked_requirements && cr.linked_requirements.length > 0 && (
              <div style={{ marginTop: 'var(--space-md)' }}>
                <span className="text-xs text-muted">Linked Requirements: </span>
                {cr.linked_requirements.map(r => <span key={r} className="badge badge-primary" style={{ marginRight: 4 }}>{r}</span>)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ──── Before vs After Impact Modal ──── */}
      {impactModal && (
        <div className="modal-overlay" onClick={() => setImpactModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(59,130,246,0.1))' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={20} color="#22c55e" /> Change Impact Analysis
              </h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setImpactModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '6px 16px' }}>
                  {impactModal.cr.code}: {impactModal.cr.title} — APPROVED
                </span>
              </div>

              {/* Scope Count */}
              <ImpactRow
                icon={<TrendingUp size={18} color="#22d3ee" />}
                label="Requirements Scope Count"
                before={`${impactModal.before.scopeCount} deliverables`}
                after={`${impactModal.after.scopeCount} deliverables`}
                delta={`+1 Deliverable`}
                deltaColor="#22c55e"
              />

              {/* Budget */}
              <ImpactRow
                icon={<DollarSign size={18} color="#f59e0b" />}
                label="Approved Budget (BAC)"
                before={`₨${impactModal.before.budget.toLocaleString()}`}
                after={`₨${impactModal.after.budget.toLocaleString()}`}
                delta={`+₨${(impactModal.cr.cost_impact || 0).toLocaleString()}`}
                deltaColor="#ef4444"
              />

              {/* Deadline */}
              <ImpactRow
                icon={<Calendar size={18} color="#3b82f6" />}
                label="Contract Deadline"
                before={impactModal.before.deadline}
                after={impactModal.after.deadline}
                delta={`+${impactModal.cr.schedule_impact_weeks} Week(s)`}
                deltaColor="#f59e0b"
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => { setImpactModal(null); toast.success('Impact acknowledged'); }}>
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ImpactRow({ icon, label, before, after, delta, deltaColor }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center', gap: '1rem',
      padding: '0.75rem', marginBottom: '0.75rem',
      background: 'var(--bg-secondary)', borderRadius: 8,
      border: '1px solid var(--border-color)',
    }}>
      <div>
        <div className="flex items-center gap-sm" style={{ marginBottom: '0.25rem' }}>
          {icon}
          <span className="text-xs text-muted">{label}</span>
        </div>
        <div style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.95rem' }}>
          {before}
        </div>
        <div className="text-xs text-muted">Before</div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <ArrowRight size={24} color="var(--text-muted)" />
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: deltaColor, marginTop: '0.15rem' }}>
          {delta}
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.95rem', color: deltaColor }}>
          {after}
        </div>
        <div className="text-xs text-muted">After</div>
      </div>
    </div>
  );
}
