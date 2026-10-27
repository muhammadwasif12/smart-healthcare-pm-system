import { useState, useEffect } from 'react';
import {
  FileText, Printer, Download, TrendingUp, AlertTriangle, Bug,
  CheckCircle2, Clock, ShieldCheck, DollarSign, Target, Calendar
} from 'lucide-react';
import {
  getEVM, getMilestones, getDefects, getRisks, getActivities,
  getCharter, getDashboard, getCPMSchedule
} from '../services/api';
import { useAppContext } from '../App';
import { toast } from 'react-hot-toast';

export default function ReportsPage() {
  const { statusDate } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    evm: null,
    milestones: [],
    defects: [],
    risks: [],
    activities: [],
    charter: null,
    dashboard: null,
    cpm: null,
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getEVM(statusDate),
      getMilestones(),
      getDefects(),
      getRisks(),
      getActivities(),
      getCharter(),
      getDashboard(),
      getCPMSchedule(),
    ])
      .then(([evm, milestones, defects, risks, activities, charter, dashboard, cpm]) => {
        setData({ evm, milestones, defects, risks, activities, charter, dashboard, cpm });
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        toast.error('Failed to load report data');
        setLoading(false);
      });
  }, [statusDate]);

  const fmt = (v) => (v !== null && v !== undefined ? `₨${Number(v).toLocaleString()}` : '—');
  const fmtM = (v) => (v !== null && v !== undefined ? `₨${(Number(v) / 1000000).toFixed(2)}M` : '—');

  // CSV download helper
  const downloadCSV = (filename, headers, rows) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row
          .map(cell => {
            const str = cell === null || cell === undefined ? '' : String(cell);
            return `"${str.replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filename}`);
  };

  const exportActivitiesCSV = () => {
    const headers = ['Code', 'Name', 'Duration (Days)', 'Planned Start', 'Planned End', 'Actual Start', 'Percent Complete', 'Status', 'Estimated Cost (PKR)'];
    const rows = data.activities.map(a => [
      a.code,
      a.name,
      a.duration,
      a.planned_start,
      a.planned_end,
      a.actual_start || '',
      `${a.percent_complete}%`,
      a.status,
      a.estimated_cost,
    ]);
    downloadCSV(`activities-report-${statusDate}.csv`, headers, rows);
  };

  const exportEVMCSV = () => {
    const evm = data.evm;
    if (!evm) return;
    const headers = ['Metric Code', 'Metric Name', 'Formula', 'Value', 'Status / Meaning'];
    const rows = [
      ['BAC', 'Budget at Completion', 'Σ Estimated Costs', evm.BAC, 'Total approved baseline budget'],
      ['PV', 'Planned Value', 'Prorated cost of scheduled work', evm.PV, 'Scheduled budget as of status date'],
      ['EV', 'Earned Value', 'Σ (% Complete × Estimated Cost)', evm.EV, 'Budgeted value of completed work'],
      ['AC', 'Actual Cost', 'Σ Incurred Expenses', evm.AC, 'Total funds disbursed by status date'],
      ['CV', 'Cost Variance', 'EV − AC', evm.CV, evm.CV >= 0 ? 'Under Budget' : 'Cost Overrun'],
      ['SV', 'Schedule Variance', 'EV − PV', evm.SV, evm.SV >= 0 ? 'Ahead of Schedule' : 'Schedule Slippage'],
      ['CPI', 'Cost Performance Index', 'EV ÷ AC', evm.CPI, evm.CPI >= 1 ? 'Cost Efficient' : 'Cost Inefficient'],
      ['SPI', 'Schedule Performance Index', 'EV ÷ PV', evm.SPI, evm.SPI >= 1 ? 'On/Ahead Schedule' : 'Behind Schedule'],
      ['EAC', 'Estimate at Completion', 'BAC ÷ CPI (unrounded)', evm.EAC, 'Projected total cost based on current efficiency'],
      ['ETC', 'Estimate to Complete', 'EAC − AC', evm.ETC, 'Remaining funds needed to finish'],
      ['VAC', 'Variance at Completion', 'BAC − EAC', evm.VAC, evm.VAC >= 0 ? 'Projected Surplus' : 'Projected Deficit'],
      ['TCPI', 'To-Complete Performance Index', '(BAC − EV) ÷ (BAC − AC)', evm.TCPI, evm.TCPI <= 1 ? 'Feasible Target' : 'High Recovery Difficulty'],
    ];
    downloadCSV(`evm-metrics-${statusDate}.csv`, headers, rows);
  };

  const exportDefectsCSV = () => {
    const headers = ['Defect Code', 'Title', 'Severity', 'Priority', 'Status', 'Assignee', 'Found In Module', 'Reported Date'];
    const rows = data.defects.map(d => [
      d.code,
      d.title,
      d.severity,
      d.priority,
      d.status,
      d.assignee_name || 'Unassigned',
      d.activity_name || 'General',
      d.created_at || '',
    ]);
    downloadCSV(`defects-log-${statusDate}.csv`, headers, rows);
  };

  const exportRisksCSV = () => {
    const headers = ['Risk Code', 'Title', 'Category', 'Probability (1-5)', 'Impact (1-5)', 'Risk Score', 'Status', 'Owner', 'Mitigation Strategy'];
    const rows = data.risks.map(r => [
      r.code,
      r.title,
      r.category,
      r.probability,
      r.impact,
      r.risk_score,
      r.status,
      r.owner_name || 'Unassigned',
      r.mitigation_strategy || '',
    ]);
    downloadCSV(`risk-register-${statusDate}.csv`, headers, rows);
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const { evm, milestones, defects, risks, activities, charter, cpm } = data;
  const criticalDefects = defects.filter(d => d.severity === 'Critical' && !['Closed', 'Verified'].includes(d.status));
  const delayedActs = activities.filter(a => a.status !== 'Completed' && a.percent_complete < 100 && a.planned_end < statusDate);

  return (
    <div className="reports-page-wrapper">
      {/* Print Control Toolbar (Hidden in Print) */}
      <div className="no-print" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="flex items-center justify-between flex-wrap gap-md">
          <div>
            <h2 className="page-title"><FileText size={24} /> Project Management Reports</h2>
            <p className="page-subtitle">A4 Print-Ready Executive Audit Report & Raw Data Exports</p>
          </div>
          <div className="flex items-center gap-sm flex-wrap">
            <button className="btn btn-primary" onClick={() => window.print()}>
              <Printer size={16} /> Print / Save as PDF
            </button>
            <div className="dropdown" style={{ display: 'inline-flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={exportActivitiesCSV} title="Export Activities to CSV">
                <Download size={14} /> Activities CSV
              </button>
              <button className="btn btn-secondary btn-sm" onClick={exportEVMCSV} title="Export EVM Metrics to CSV">
                <Download size={14} /> EVM CSV
              </button>
              <button className="btn btn-secondary btn-sm" onClick={exportDefectsCSV} title="Export Defects to CSV">
                <Download size={14} /> Defects CSV
              </button>
              <button className="btn btn-secondary btn-sm" onClick={exportRisksCSV} title="Export Risks to CSV">
                <Download size={14} /> Risks CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ──── Printable Executive Report Body (A4 Styled) ──── */}
      <div className="printable-report">
        {/* Document Header */}
        <div className="report-header">
          <div className="flex items-center justify-between" style={{ borderBottom: '2px solid #334155', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
                SMART HEALTHCARE PM SYSTEM
              </h1>
              <div style={{ fontSize: '0.9rem', color: '#475569', marginTop: '0.25rem' }}>
                Executive Status & Performance Audit Report • CSE-494 Mid-Term Lab
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-block', padding: '0.35rem 0.75rem', borderRadius: 4, background: '#fee2e2', color: '#991b1b', fontWeight: 700, fontSize: '0.85rem' }}>
                STATUS: ACTION REQUIRED
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.35rem' }}>
                Audit Status Date: <strong>{statusDate}</strong>
              </div>
            </div>
          </div>

          {/* Project Metadata Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: 6, border: '1px solid #e2e8f0', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Project Name</span>
              <strong style={{ color: '#1e293b' }}>{charter?.title || 'Smart Healthcare System'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Project Manager</span>
              <strong style={{ color: '#1e293b' }}>{charter?.project_manager || 'Ahmad Khan'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Approved Baseline (BAC)</span>
              <strong style={{ color: '#1e293b' }}>₨{charter?.approved_budget?.toLocaleString() || '5,000,000'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Contractual Finish</span>
              <strong style={{ color: '#1e293b' }}>{charter?.end_date || '2026-12-27'}</strong>
            </div>
          </div>
        </div>

        {/* Executive EVM Metrics Table */}
        <div className="report-section" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.35rem', marginBottom: '0.75rem' }}>
            1. Earned Value Performance Metrics (Status Date: {statusDate})
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                <th style={{ padding: '6px 8px' }}>Metric</th>
                <th style={{ padding: '6px 8px' }}>Formula</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Calculated Value</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Benchmark / Target</th>
                <th style={{ padding: '6px 8px' }}>Interpretation</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '6px 8px', fontWeight: 600 }}>Budget at Completion (BAC)</td>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace', color: '#64748b' }}>Σ Estimated Cost</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>₨{evm?.BAC?.toLocaleString()}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>₨5,000,000</td>
                <td style={{ padding: '6px 8px', color: '#166534' }}>Baselined Project Budget</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '6px 8px', fontWeight: 600 }}>Planned Value (PV)</td>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace', color: '#64748b' }}>Prorated planned cost</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>₨{evm?.PV?.toLocaleString()}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>81.1% of BAC</td>
                <td style={{ padding: '6px 8px', color: '#1e293b' }}>Natural S-curve (W12 of 16)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '6px 8px', fontWeight: 600 }}>Earned Value (EV)</td>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace', color: '#64748b' }}>Σ (%complete × cost)</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>₨{evm?.EV?.toLocaleString()}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>71.4% of BAC</td>
                <td style={{ padding: '6px 8px', color: '#b45309' }}>Lagging planned work</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '6px 8px', fontWeight: 600 }}>Actual Cost (AC)</td>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace', color: '#64748b' }}>Σ Incurred Expenses</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>₨{evm?.AC?.toLocaleString()}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>84.1% of BAC</td>
                <td style={{ padding: '6px 8px', color: '#991b1b' }}>Exceeding earned value</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#fef2f2' }}>
                <td style={{ padding: '6px 8px', fontWeight: 700, color: '#991b1b' }}>Cost Performance Index (CPI)</td>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace', color: '#64748b' }}>EV ÷ AC</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 800, color: '#991b1b' }}>{evm?.CPI?.toFixed(4)}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>≥ 1.000</td>
                <td style={{ padding: '6px 8px', fontWeight: 600, color: '#991b1b' }}>Over budget (₨0.85 value / ₨1 spent)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#fffbeb' }}>
                <td style={{ padding: '6px 8px', fontWeight: 700, color: '#92400e' }}>Schedule Performance Index (SPI)</td>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace', color: '#64748b' }}>EV ÷ PV</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 800, color: '#92400e' }}>{evm?.SPI?.toFixed(4)}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>≥ 1.000</td>
                <td style={{ padding: '6px 8px', fontWeight: 600, color: '#92400e' }}>Behind schedule (88% rate)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '6px 8px', fontWeight: 600 }}>Estimate at Completion (EAC)</td>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace', color: '#64748b' }}>BAC ÷ (EV/AC)</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#991b1b' }}>₨{evm?.EAC?.toLocaleString()}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>₨5,000,000</td>
                <td style={{ padding: '6px 8px', color: '#991b1b' }}>Forecast overrun: ₨882,600</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '6px 8px', fontWeight: 600 }}>Variance at Completion (VAC)</td>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace', color: '#64748b' }}>BAC − EAC</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#991b1b' }}>-₨{Math.abs(evm?.VAC || 0).toLocaleString()}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>≥ 0</td>
                <td style={{ padding: '6px 8px', color: '#991b1b' }}>Deficit at completion</td>
              </tr>
              <tr style={{ borderBottom: '2px solid #cbd5e1', background: '#f8fafc' }}>
                <td style={{ padding: '6px 8px', fontWeight: 700 }}>To-Complete Performance Index (TCPI)</td>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace', color: '#64748b' }}>(BAC−EV) ÷ (BAC−AC)</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 800, color: '#991b1b' }}>{evm?.TCPI?.toFixed(4)}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>≤ 1.000</td>
                <td style={{ padding: '6px 8px', fontWeight: 600, color: '#991b1b' }}>Unrealistic without budget/scope revision</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Milestones & Critical Path */}
        <div className="report-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.35rem', marginBottom: '0.5rem' }}>
              2. Key Project Milestones
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                  <th style={{ padding: '4px 6px' }}>Milestone</th>
                  <th style={{ padding: '4px 6px' }}>Planned Date</th>
                  <th style={{ padding: '4px 6px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {milestones.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 500 }}>{m.name}</td>
                    <td style={{ padding: '4px 6px', fontFamily: 'monospace' }}>{m.planned_date}</td>
                    <td style={{ padding: '4px 6px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 6px',
                        borderRadius: 3,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        background: m.status === 'Completed' ? '#dcfce7' : m.status === 'In Progress' ? '#dbeafe' : '#f1f5f9',
                        color: m.status === 'Completed' ? '#166534' : m.status === 'In Progress' ? '#1e40af' : '#475569',
                      }}>
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.35rem', marginBottom: '0.5rem' }}>
              3. Critical Path & Delays
            </h3>
            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
              <div><strong>Projected End:</strong> {cpm?.projectedEnd} (Baseline: {charter?.end_date})</div>
              <div><strong>Critical Path Activities:</strong> {cpm?.criticalPath?.length} activities</div>
              <div style={{ color: delayedActs.length > 0 ? '#991b1b' : '#166534', fontWeight: 600, marginTop: '0.25rem' }}>
                {delayedActs.length} active activities past planned end date
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                  <th style={{ padding: '4px 6px' }}>Delayed Activity</th>
                  <th style={{ padding: '4px 6px' }}>Due</th>
                  <th style={{ padding: '4px 6px' }}>% Done</th>
                </tr>
              </thead>
              <tbody>
                {delayedActs.slice(0, 4).map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '4px 6px' }}>{a.code}: {a.name}</td>
                    <td style={{ padding: '4px 6px', fontFamily: 'monospace' }}>{a.planned_end}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 600, color: '#dc2626' }}>{a.percent_complete}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quality Defects & Risks Summary */}
        <div className="report-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.35rem', marginBottom: '0.5rem' }}>
              4. Defect Log Summary ({defects.length} Total, {criticalDefects.length} Critical)
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                  <th style={{ padding: '4px 6px' }}>Defect</th>
                  <th style={{ padding: '4px 6px' }}>Severity</th>
                  <th style={{ padding: '4px 6px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {defects.slice(0, 4).map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '4px 6px' }}><strong>{d.code}</strong>: {d.title}</td>
                    <td style={{ padding: '4px 6px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '1px 5px',
                        borderRadius: 3,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: d.severity === 'Critical' ? '#fee2e2' : d.severity === 'High' ? '#ffedd5' : '#e0e7ff',
                        color: d.severity === 'Critical' ? '#991b1b' : d.severity === 'High' ? '#9a3412' : '#3730a3',
                      }}>
                        {d.severity}
                      </span>
                    </td>
                    <td style={{ padding: '4px 6px', fontSize: '0.75rem' }}>{d.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.35rem', marginBottom: '0.5rem' }}>
              5. Top Risk Register Items
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                  <th style={{ padding: '4px 6px' }}>Risk</th>
                  <th style={{ padding: '4px 6px' }}>Score</th>
                  <th style={{ padding: '4px 6px' }}>Mitigation</th>
                </tr>
              </thead>
              <tbody>
                {risks.slice(0, 4).map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '4px 6px' }}><strong>{r.code}</strong>: {r.title}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 700, color: r.risk_score >= 12 ? '#dc2626' : '#d97706' }}>
                      {r.risk_score}
                    </td>
                    <td style={{ padding: '4px 6px', fontSize: '0.7rem', color: '#475569', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.mitigation_strategy || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sign-off Block for Formal University Exam Submission */}
        <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '2px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569' }}>
          <div>
            <div><strong>Project Manager Sign-off:</strong> _________________________</div>
            <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Ahmad Khan (PMP) • Smart Healthcare PM</div>
          </div>
          <div>
            <div><strong>Lead Faculty Auditor:</strong> _________________________</div>
            <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Department of Computer Science • CSE-494</div>
          </div>
          <div>
            <div><strong>Date of Review:</strong> _________________________</div>
            <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Lab Exam Mid-Term Session</div>
          </div>
        </div>
      </div>
    </div>
  );
}
