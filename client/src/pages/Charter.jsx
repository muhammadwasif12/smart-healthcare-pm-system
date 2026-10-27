import { useState, useEffect } from 'react';
import { getCharter, updateCharter } from '../services/api';
import { FileText, Save, Building2, Calendar, DollarSign, Users, CheckCircle2, XCircle, ListOrdered, Check, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function CharterPage() {
  const [charter, setCharter] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    loadCharter();
  }, []);

  const loadCharter = () => {
    getCharter().then(c => {
      setCharter(c);
      setForm({
        ...c,
        objectivesText: Array.isArray(c.objectives) ? c.objectives.join('\n') : (c.objectives || ''),
        scopeInText: Array.isArray(c.scope_in) ? c.scope_in.join('\n') : (c.scope_in || ''),
        scopeOutText: Array.isArray(c.scope_out) ? c.scope_out.join('\n') : (c.scope_out || '')
      });
    }).catch(() => toast.error('Failed to load charter'));
  };

  const handleSave = async () => {
    try {
      const payload = {
        title: form.title,
        description: form.description,
        sponsor: form.sponsor,
        project_manager: form.project_manager,
        approval_status: form.approval_status,
        approved_budget: parseFloat(form.approved_budget) || 0,
        start_date: form.start_date,
        end_date: form.end_date,
        objectives: form.objectivesText.split('\n').map(s => s.trim()).filter(Boolean),
        scope_in: form.scopeInText.split('\n').map(s => s.trim()).filter(Boolean),
        scope_out: form.scopeOutText.split('\n').map(s => s.trim()).filter(Boolean)
      };
      const updated = await updateCharter(payload);
      setCharter(updated);
      setForm({
        ...updated,
        objectivesText: Array.isArray(updated.objectives) ? updated.objectives.join('\n') : '',
        scopeInText: Array.isArray(updated.scope_in) ? updated.scope_in.join('\n') : '',
        scopeOutText: Array.isArray(updated.scope_out) ? updated.scope_out.join('\n') : ''
      });
      setEditing(false);
      toast.success('Charter updated successfully');
    } catch {
      toast.error('Failed to save charter');
    }
  };

  if (!charter) return <div className="loading-spinner"><div className="spinner" /></div>;

  const durationWeeks = charter.start_date && charter.end_date
    ? Math.round((new Date(charter.end_date) - new Date(charter.start_date)) / 86400000 / 7)
    : 16;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="flex items-center gap-md">
            <h2 className="page-title"><FileText size={24} /> Project Charter</h2>
            <span className={`badge ${charter.approval_status === 'Approved' ? 'badge-success' : charter.approval_status === 'Draft' ? 'badge-warning' : 'badge-danger'}`}>
              {charter.approval_status}
            </span>
          </div>
          <p className="page-subtitle">Official project authorization, authority baseline, and scope boundaries</p>
        </div>
        <div className="flex gap-sm">
          {editing ? (
            <>
              <button className="btn btn-ghost" onClick={() => { setEditing(false); loadCharter(); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}><Save size={16} /> Save Changes</button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => setEditing(true)}>Edit Charter</button>
          )}
        </div>
      </div>

      {/* Main Details */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Building2 size={18} /> Governance & Authority</div>
          </div>
          <Field label="Project Title" value={form.title} editing={editing} onChange={v => setForm({ ...form, title: v })} />
          <Field label="Project Sponsor" value={form.sponsor} editing={editing} onChange={v => setForm({ ...form, sponsor: v })} />
          <Field label="Project Manager" value={form.project_manager} editing={editing} onChange={v => setForm({ ...form, project_manager: v })} />
          
          <div className="form-group">
            <div className="form-label">Approval Status</div>
            {editing ? (
              <select className="form-select" value={form.approval_status || 'Draft'} onChange={e => setForm({ ...form, approval_status: e.target.value })}>
                <option value="Draft">Draft</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            ) : (
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{charter.approval_status}</div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title"><Calendar size={18} /> Timeline & Budget Baseline</div>
          </div>
          <Field label="Start Date" value={form.start_date} editing={editing} type="date" onChange={v => setForm({ ...form, start_date: v })} />
          <Field label="End Date" value={form.end_date} editing={editing} type="date" onChange={v => setForm({ ...form, end_date: v })} />
          <Field label="Approved Budget (PKR)" value={form.approved_budget} editing={editing} type="number" onChange={v => setForm({ ...form, approved_budget: v })} />
          
          <div className="form-group">
            <div className="form-label">Duration (Calculated)</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-primary-light)' }}>
              {durationWeeks} weeks ({durationWeeks * 7} calendar days)
            </div>
          </div>
        </div>
      </div>

      {/* Project Description */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card-header">
          <div className="card-title"><FileText size={18} /> Project Purpose & High-Level Description</div>
        </div>
        {editing ? (
          <textarea
            className="form-textarea"
            rows={4}
            value={form.description || ''}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Enter high-level purpose and description..."
          />
        ) : (
          <p className="text-secondary" style={{ lineHeight: 1.8, fontSize: '0.95rem' }}>
            {charter.description || 'No description entered.'}
          </p>
        )}
      </div>

      {/* Objectives */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card-header">
          <div className="card-title"><ListOrdered size={18} /> Project Objectives (SMART)</div>
        </div>
        {editing ? (
          <div>
            <p className="text-xs text-muted mb-xs">Enter one objective per line:</p>
            <textarea
              className="form-textarea"
              rows={6}
              value={form.objectivesText || ''}
              onChange={e => setForm({ ...form, objectivesText: e.target.value })}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {charter.objectives && charter.objectives.length > 0 ? (
              charter.objectives.map((obj, i) => (
                <div key={i} className="flex items-start gap-sm">
                  <span className="badge badge-primary" style={{ minWidth: 24, textAlign: 'center' }}>{i + 1}</span>
                  <span className="text-sm" style={{ lineHeight: 1.6 }}>{obj}</span>
                </div>
              ))
            ) : (
              <p className="text-secondary text-sm">No objectives defined.</p>
            )}
          </div>
        )}
      </div>

      {/* Scope Boundaries */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title text-success flex items-center gap-xs">
              <CheckCircle2 size={18} /> In-Scope Deliverables
            </div>
          </div>
          {editing ? (
            <div>
              <p className="text-xs text-muted mb-xs">Enter one deliverable per line:</p>
              <textarea
                className="form-textarea"
                rows={7}
                value={form.scopeInText || ''}
                onChange={e => setForm({ ...form, scopeInText: e.target.value })}
              />
            </div>
          ) : (
            <div className="flex flex-wrap gap-xs">
              {charter.scope_in && charter.scope_in.length > 0 ? (
                charter.scope_in.map((item, i) => (
                  <span key={i} className="badge badge-success" style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                    <Check size={12} style={{ display: 'inline', marginRight: 4 }} />{item}
                  </span>
                ))
              ) : (
                <p className="text-secondary text-sm">No in-scope items.</p>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title text-danger flex items-center gap-xs">
              <XCircle size={18} /> Out-of-Scope Boundaries
            </div>
          </div>
          {editing ? (
            <div>
              <p className="text-xs text-muted mb-xs">Enter one boundary item per line:</p>
              <textarea
                className="form-textarea"
                rows={7}
                value={form.scopeOutText || ''}
                onChange={e => setForm({ ...form, scopeOutText: e.target.value })}
              />
            </div>
          ) : (
            <div className="flex flex-wrap gap-xs">
              {charter.scope_out && charter.scope_out.length > 0 ? (
                charter.scope_out.map((item, i) => (
                  <span key={i} className="badge badge-danger" style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                    <X size={12} style={{ display: 'inline', marginRight: 4 }} />{item}
                  </span>
                ))
              ) : (
                <p className="text-secondary text-sm">No out-of-scope items.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, editing, onChange, type = 'text' }) {
  return (
    <div className="form-group">
      <div className="form-label">{label}</div>
      {editing ? (
        <input className="form-input" type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} />
      ) : (
        <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>
          {type === 'number' ? `PKR ${parseFloat(value || 0).toLocaleString()}` : (value || '—')}
        </div>
      )}
    </div>
  );
}
