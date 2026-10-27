import { useState, useEffect } from 'react';
import { getPlan, updatePlan } from '../services/api';
import { ClipboardList, Save, Target, Calendar, DollarSign, CheckCircle, BarChart3, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function PlanPage() {
  const [plan, setPlan] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = () => {
    getPlan().then(p => {
      setPlan(p);
      setForm({
        scope_notes: p.scope_notes || '',
        schedule_notes: p.schedule_notes || '',
        cost_notes: p.cost_notes || '',
        quality_notes: p.quality_notes || ''
      });
    }).catch(() => toast.error('Failed to load project plan'));
  };

  const handleSave = async () => {
    try {
      const updated = await updatePlan(form);
      setPlan(prev => ({ ...prev, ...updated }));
      setEditing(false);
      toast.success('Project Management Plan saved');
    } catch {
      toast.error('Failed to save plan');
    }
  };

  if (!plan) return <div className="loading-spinner"><div className="spinner" /></div>;

  const live = plan.liveData || {};

  const sections = [
    {
      key: 'scope_notes',
      title: 'Scope Management & Baseline',
      icon: Target,
      stat: `${live.approved_requirements_count ?? 15} Approved Requirements, ${live.wbs_work_packages ?? 0} Work Packages`,
      description: 'Defines how requirements are gathered, traced, validated, and how work breakdown structures are managed.'
    },
    {
      key: 'schedule_notes',
      title: 'Schedule Management & Critical Path',
      icon: Calendar,
      stat: `Target Completion: ${live.project_end_date || '2026-12-27'}`,
      description: 'Specifies scheduling methodology, CPM forward/backward pass, float calculations, and milestone tracking.'
    },
    {
      key: 'cost_notes',
      title: 'Cost Management & EVM Governance',
      icon: DollarSign,
      stat: `Approved BAC: PKR ${(live.approved_budget || 5000000).toLocaleString()}`,
      description: 'Rules for budget allocation, expense logging, Earned Value analysis (CPI/SPI), and cost variance thresholds.'
    },
    {
      key: 'quality_notes',
      title: 'Quality & Defect Management',
      icon: CheckCircle,
      stat: live.checklist_pass_rate != null ? `Pass Rate: ${live.checklist_pass_rate}%` : 'Checklists Active',
      description: 'Inspection criteria, defect severity levels, quality gate rules, and sign-off prerequisites for closure.'
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><ClipboardList size={24} /> Project Management Plan</h2>
          <p className="page-subtitle">Master operational plan integrating scope, schedule, cost, and quality baselines</p>
        </div>
        <div className="flex gap-sm">
          {editing ? (
            <>
              <button className="btn btn-ghost" onClick={() => { setEditing(false); loadPlan(); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}><Save size={16} /> Save Plan</button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => setEditing(true)}>Edit Plan</button>
          )}
        </div>
      </div>

      {/* Live Integration Cards */}
      <div className="stats-grid mb-xl">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Scope Items</span>
            <Target size={18} style={{ color: 'var(--accent-primary-light)' }} />
          </div>
          <div className="stat-value">{live.approved_requirements_count ?? 15}</div>
          <div className="stat-desc">Approved Requirements</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">WBS Work Packages</span>
            <BarChart3 size={18} style={{ color: 'var(--accent-secondary)' }} />
          </div>
          <div className="stat-value">{live.wbs_work_packages ?? 0}</div>
          <div className="stat-desc">Deliverables Decomposition</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Approved Budget</span>
            <DollarSign size={18} style={{ color: 'var(--accent-success)' }} />
          </div>
          <div className="stat-value">PKR {((live.approved_budget || 5000000) / 1000000).toFixed(1)}M</div>
          <div className="stat-desc">Baseline at Completion (BAC)</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Target End Date</span>
            <Calendar size={18} style={{ color: 'var(--accent-warning)' }} />
          </div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>{live.project_end_date || '2026-12-27'}</div>
          <div className="stat-desc">16-Week Schedule Target</div>
        </div>
      </div>

      {/* Subsidiary Plans */}
      <div className="grid-2" style={{ gap: 'var(--space-lg)' }}>
        {sections.map(s => {
          const Icon = s.icon;
          return (
            <div className="card" key={s.key}>
              <div className="card-header flex justify-between items-center">
                <div className="card-title flex items-center gap-xs">
                  <Icon size={18} style={{ color: 'var(--accent-primary-light)' }} />
                  {s.title}
                </div>
                <span className="badge badge-primary">{s.stat}</span>
              </div>
              <p className="text-xs text-muted mb-sm">{s.description}</p>
              {editing ? (
                <textarea
                  className="form-textarea"
                  rows={5}
                  value={form[s.key] || ''}
                  onChange={e => setForm({ ...form, [s.key]: e.target.value })}
                  placeholder={`Document ${s.title.toLowerCase()} policies and procedures...`}
                />
              ) : (
                <div className="card-body-text" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  {plan[s.key] || 'No specific notes recorded for this area.'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
