import { useState, useEffect, useRef, useMemo } from 'react';
import { getCPMSchedule, getDelayAnalysis, getDependencies, getMilestones } from '../services/api';
import { useAppContext } from '../App';
import { CalendarDays, AlertTriangle, Zap, GitCommit, Eye, EyeOff, Diamond, ArrowRight } from 'lucide-react';

export default function SchedulePage() {
  const [cpm, setCpm] = useState(null);
  const [delays, setDelays] = useState(null);
  const [dependencies, setDependencies] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('gantt');
  const [showArrows, setShowArrows] = useState(true);
  const [showMilestones, setShowMilestones] = useState(true);
  const { statusDate } = useAppContext();

  const ganttContainerRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getCPMSchedule(),
      getDelayAnalysis(),
      getDependencies().catch(() => []),
      getMilestones().catch(() => []),
    ])
      .then(([c, d, deps, ms]) => {
        setCpm(c);
        setDelays(d);
        setDependencies(deps || []);
        setMilestones(ms || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [statusDate]);

  const { results = [], criticalPath = [], projectedEnd = '2026-12-27' } = cpm || {};
  const projectStart = new Date('2026-09-07T00:00:00Z');
  const projectEndDate = new Date(projectedEnd + 'T00:00:00Z');
  const totalDays = Math.max(1, Math.round((projectEndDate - projectStart) / 86400000) + 1);

  const delayedList = delays?.delayedActivities || delays?.delayed || [];
  const cascadedList = delays?.impactedActivities || delays?.cascaded || [];
  const deadlineImpact = delays?.deadlineImpact || delays?.deadline_impact;

  // Compute row indexes and bar positions for dependency arrow rendering
  const rowHeight = 40; // px per row
  const headerHeight = 36; // px for timeline header

  const activityIndexMap = useMemo(() => {
    const map = new Map();
    results.forEach((r, idx) => {
      map.set(r.id, { index: idx, ...r });
    });
    return map;
  }, [results]);

  // Dependency arrows calculation
  const dependencyLines = useMemo(() => {
    if (!showArrows || results.length === 0) return [];
    const lines = [];

    dependencies.forEach((dep) => {
      const pred = activityIndexMap.get(dep.predecessor_id);
      const succ = activityIndexMap.get(dep.activity_id);

      if (pred && succ) {
        const predStart = new Date(pred.ES + 'T00:00:00Z');
        const predEnd = new Date(pred.EF + 'T00:00:00Z');
        const succStart = new Date(succ.ES + 'T00:00:00Z');

        const predLeftPct = ((predStart - projectStart) / 86400000) / totalDays * 100;
        const predWidthPct = Math.max(0.5, ((predEnd - predStart) / 86400000 + 1) / totalDays * 100);
        const succLeftPct = ((succStart - projectStart) / 86400000) / totalDays * 100;

        const startX = predLeftPct + predWidthPct; // End of predecessor bar
        const startY = headerHeight + pred.index * rowHeight + rowHeight / 2;
        const endX = succLeftPct; // Start of successor bar
        const endY = headerHeight + succ.index * rowHeight + rowHeight / 2;

        const isCritical = criticalPath.includes(pred.id) && criticalPath.includes(succ.id);

        lines.push({
          id: `${dep.predecessor_id}-${dep.activity_id}`,
          startX,
          startY,
          endX,
          endY,
          isCritical,
          predCode: pred.code,
          succCode: succ.code,
          lag: dep.lag_days || 0,
        });
      }
    });

    return lines;
  }, [dependencies, activityIndexMap, showArrows, results, criticalPath, totalDays, headerHeight, rowHeight]);

  if (loading || !cpm) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><CalendarDays size={24} /> Schedule & Critical Path</h2>
          <p className="page-subtitle">
            Projected End: <strong>{projectedEnd}</strong> • Critical Path:{' '}
            <span style={{ color: 'var(--status-warning)', fontWeight: 600 }}>{criticalPath.length} activities</span> •
            {delayedList.length > 0 ? (
              <span style={{ color: 'var(--status-danger)', fontWeight: 600 }}> {delayedList.length} delayed</span>
            ) : (
              <span style={{ color: 'var(--status-success)', fontWeight: 600 }}> On Track</span>
            )}
          </p>
        </div>
        <div className="flex gap-sm items-center">
          {tab === 'gantt' && (
            <>
              <button
                className={`btn btn-sm ${showArrows ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setShowArrows(!showArrows)}
                title="Toggle dependency arrow overlay"
              >
                {showArrows ? <Eye size={14} /> : <EyeOff size={14} />}
                <span>Dependency Arrows ({dependencies.length})</span>
              </button>
              <button
                className={`btn btn-sm ${showMilestones ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setShowMilestones(!showMilestones)}
                title="Toggle milestone markers"
              >
                <Diamond size={14} />
                <span>Milestones ({milestones.length})</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="tabs" style={{ maxWidth: 440, marginBottom: 'var(--space-lg)' }}>
        <button className={`tab ${tab === 'gantt' ? 'active' : ''}`} onClick={() => setTab('gantt')}>Gantt Chart</button>
        <button className={`tab ${tab === 'cpm' ? 'active' : ''}`} onClick={() => setTab('cpm')}>CPM Table</button>
        <button className={`tab ${tab === 'delays' ? 'active' : ''}`} onClick={() => setTab('delays')}>Delay Analysis</button>
      </div>

      {tab === 'gantt' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Interactive Gantt Chart with CPM Critical Path & Dependencies</div>
            <div className="flex gap-md text-xs" style={{ flexWrap: 'wrap' }}>
              <span className="flex items-center gap-sm">
                <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--gradient-primary)', display: 'inline-block' }} /> Normal
              </span>
              <span className="flex items-center gap-sm">
                <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--gradient-success)', display: 'inline-block' }} /> Completed
              </span>
              <span className="flex items-center gap-sm">
                <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--gradient-warning)', display: 'inline-block' }} /> Critical Path
              </span>
              <span className="flex items-center gap-sm">
                <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--gradient-danger)', display: 'inline-block' }} /> Delayed
              </span>
              <span className="flex items-center gap-sm">
                <span style={{ color: '#ec4899', fontSize: '13px' }}>◆</span> Milestone Diamond
              </span>
              <span className="flex items-center gap-sm">
                <span style={{ width: 16, height: 2, background: '#f59e0b', display: 'inline-block' }} /> Critical Dependency
              </span>
            </div>
          </div>

          {/* Milestone timeline diamond track */}
          {showMilestones && milestones.length > 0 && (
            <div style={{
              background: 'rgba(236, 72, 153, 0.05)',
              borderBottom: '1px solid var(--border-color)',
              padding: '6px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              overflowX: 'auto',
            }}>
              <div style={{ minWidth: 200, fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Diamond size={14} /> Key Milestones:
              </div>
              <div style={{ position: 'relative', flex: 1, minWidth: 600, height: 26 }}>
                {milestones.map((ms) => {
                  const dateStr = ms.planned_date || ms.target_date || '2026-09-11';
                  const msDate = new Date(dateStr + 'T00:00:00Z');
                  const offsetPct = Math.min(100, Math.max(0, ((msDate - projectStart) / 86400000) / totalDays * 100));
                  const isAchieved = ms.status === 'Completed' || ms.status === 'Achieved';
                  const msCode = ms.code || `MS-${ms.id}`;
                  const msName = ms.name || ms.title || 'Milestone';

                  return (
                    <div
                      key={ms.id}
                      title={`${msCode}: ${msName} (${dateStr}) - Status: ${ms.status}`}
                      style={{
                        position: 'absolute',
                        left: `${offsetPct}%`,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        display: 'flex',
                        alignItems: 'center',
                        flexDirection: 'column',
                        cursor: 'pointer',
                        zIndex: 4,
                      }}
                    >
                      <div
                        style={{
                          width: 14,
                          height: 14,
                          transform: 'rotate(45deg)',
                          background: isAchieved ? 'var(--status-success)' : '#ec4899',
                          border: '2px solid rgba(255, 255, 255, 0.9)',
                          boxShadow: '0 0 8px rgba(236, 72, 153, 0.6)',
                          transition: 'transform 0.2s',
                        }}
                      />
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          marginTop: 3,
                          whiteSpace: 'nowrap',
                          color: isAchieved ? 'var(--status-success)' : 'var(--text-secondary)',
                          background: 'rgba(15, 23, 42, 0.85)',
                          padding: '1px 4px',
                          borderRadius: 3,
                        }}
                      >
                        {msCode} ({dateStr.slice(5)})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Gantt body with bars and SVG overlay */}
          <div className="gantt-scroll-viewport">
            <div
              className="gantt-container"
              ref={ganttContainerRef}
              style={{
                overflowX: 'visible',
                position: 'relative',
                minHeight: results.length * rowHeight + headerHeight + 20,
              }}
            >
            {/* Month Headers */}
            <div className="gantt-row" style={{ height: headerHeight, marginBottom: 2, alignItems: 'center' }}>
              <div className="gantt-label" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                Activity ({results.length})
                </div>
              <div
                className="gantt-bar-container"
                style={{
                  display: 'flex',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: 4,
                  position: 'relative',
                }}
              >
                {['Sep 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026', 'Jan 2027'].map((m, i) => (
                  <div
                    key={m}
                    style={{
                      flex: i < 4 ? 30 : 10,
                      textAlign: 'center',
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      borderLeft: i > 0 ? '1px dashed rgba(148, 163, 184, 0.15)' : 'none',
                    }}
                  >
                    {m}
                  </div>
                ))}
              </div>
            </div>

            {/* SVG Overlay for Dependency Arrows */}
            {showArrows && (
              <svg
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 200, // width of gantt-label
                  right: 0,
                  bottom: 0,
                  width: 'calc(100% - 200px)',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              >
                <defs>
                  <marker
                    id="arrow-normal"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#14b8a6" />
                  </marker>
                  <marker
                    id="arrow-critical"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#f59e0b" />
                  </marker>
                </defs>

                {dependencyLines.map((line) => {
                  const strokeColor = line.isCritical ? '#f59e0b' : 'rgba(20, 184, 166, 0.5)';
                  const markerUrl = line.isCritical ? 'url(#arrow-critical)' : 'url(#arrow-normal)';
                  const strokeWidth = line.isCritical ? 2.2 : 1.4;

                  return (
                    <g key={line.id}>
                      <path
                        d={`M ${line.startX}% ${line.startY}px C ${line.startX + 2}% ${line.startY}px, ${Math.max(0, line.endX - 2)}% ${line.endY}px, ${line.endX}% ${line.endY}px`}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={line.isCritical ? 'none' : '3,2'}
                        markerEnd={markerUrl}
                      />
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Activities Gantt Rows */}
            {results.map((r) => {
              const start = new Date(r.ES + 'T00:00:00Z');
              const end = new Date(r.EF + 'T00:00:00Z');
              const leftPct = ((start - projectStart) / 86400000) / totalDays * 100;
              const widthPct = ((end - start) / 86400000 + 1) / totalDays * 100;
              const isCritical = criticalPath.includes(r.id);
              const isComplete = r.percent_complete === 100;
              const isDelayed = delayedList.some((d) => d.id === r.id);
              const barClass = isComplete ? 'completed' : isDelayed ? 'delayed' : isCritical ? 'critical' : '';

              // Find predecessors for label tooltip
              const preds = dependencies
                .filter((d) => d.activity_id === r.id)
                .map((d) => {
                  const p = activityIndexMap.get(d.predecessor_id);
                  return p ? p.code : `ID:${d.predecessor_id}`;
                });

              return (
                <div className="gantt-row" key={r.id} style={{ height: rowHeight }}>
                  <div className="gantt-label" title={`${r.code}: ${r.name} (Slack: ${r.slack}d)`}>
                    <span
                      className="font-mono text-xs"
                      style={{
                        color: isCritical ? 'var(--status-warning)' : 'var(--text-muted)',
                        fontWeight: isCritical ? 700 : 500,
                        marginRight: 6,
                      }}
                    >
                      {r.code}
                    </span>
                    <span style={{ fontSize: '0.8rem' }}>{r.name}</span>
                    {preds.length > 0 && (
                      <span
                        className="text-xs"
                        style={{
                          marginLeft: 6,
                          fontSize: '0.65rem',
                          color: 'var(--text-muted)',
                          background: 'rgba(148, 163, 184, 0.08)',
                          padding: '1px 4px',
                          borderRadius: 3,
                        }}
                        title={`Depends on: ${preds.join(', ')}`}
                      >
                        ← {preds.join(',')}
                      </span>
                    )}
                  </div>
                  <div className="gantt-bar-container" style={{ position: 'relative' }}>
                    <div
                      className={`gantt-bar ${barClass}`}
                      style={{
                        left: `${leftPct}%`,
                        width: `${Math.max(widthPct, 0.6)}%`,
                      }}
                      title={`${r.code} (${r.duration}d)\nDates: ${r.ES} → ${r.EF}\nSlack: ${r.slack}d\nProgress: ${r.percent_complete}%\nCritical: ${isCritical ? 'YES' : 'No'}`}
                    >
                      <div className="gantt-bar-fill" style={{ width: `${r.percent_complete}%` }} />
                      <span
                        style={{
                          position: 'absolute',
                          left: '100%',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          marginLeft: 6,
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          color: isCritical ? 'var(--status-warning)' : 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {r.duration}d {r.slack === 0 ? '★ CP' : `(s:${r.slack})`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Status Date / Today line */}
            {(() => {
              const todayOffset = ((new Date(statusDate + 'T00:00:00Z') - projectStart) / 86400000) / totalDays * 100;
              return (
                todayOffset >= 0 &&
                todayOffset <= 100 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `calc(200px + ${todayOffset}%)`,
                      top: 0,
                      bottom: 0,
                      width: 2,
                      background: 'var(--accent-rose)',
                      opacity: 0.85,
                      zIndex: 6,
                      boxShadow: '0 0 6px rgba(244, 63, 94, 0.6)',
                    }}
                    title={`Status Date: ${statusDate}`}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: 2,
                        left: 4,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: 'var(--accent-rose)',
                        background: 'rgba(15, 23, 42, 0.9)',
                        padding: '1px 5px',
                        borderRadius: 3,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Status: {statusDate}
                    </span>
                  </div>
                )
              );
            })()}
          </div>
        </div>
        </div>
      )}

      {tab === 'cpm' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Zap size={18} /> CPM Forward & Backward Pass Calculation</div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Activity Name</th>
                  <th>Dur</th>
                  <th>ES</th>
                  <th>EF</th>
                  <th>LS</th>
                  <th>LF</th>
                  <th>Total Slack</th>
                  <th>Critical Path?</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => {
                  const isCrit = criticalPath.includes(r.id);
                  return (
                    <tr key={r.id} style={isCrit ? { background: 'rgba(245, 158, 11, 0.08)' } : {}}>
                      <td className="font-mono text-xs">{r.code}</td>
                      <td className="truncate" style={{ maxWidth: 220 }}>{r.name}</td>
                      <td className="text-center">{r.duration}d</td>
                      <td className="font-mono text-xs">{r.ES}</td>
                      <td className="font-mono text-xs">{r.EF}</td>
                      <td className="font-mono text-xs">{r.LS}</td>
                      <td className="font-mono text-xs">{r.LF}</td>
                      <td
                        className={`text-center font-mono ${r.slack === 0 ? 'font-bold' : ''}`}
                        style={r.slack === 0 ? { color: 'var(--status-warning)' } : {}}
                      >
                        {r.slack}d
                      </td>
                      <td className="text-center">
                        {isCrit ? (
                          <span className="badge badge-warning">CRITICAL (Slack=0)</span>
                        ) : (
                          <span className="badge badge-neutral">Float ({r.slack}d)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'delays' && (
        <div>
          {delayedList.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <AlertTriangle size={48} />
                <p>No delayed activities detected</p>
              </div>
            </div>
          ) : (
            <>
              <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                <div className="card-header">
                  <div className="card-title">
                    <AlertTriangle size={18} /> Delayed Activities ({delayedList.length})
                  </div>
                  {deadlineImpact && (
                    <span className={`badge ${(deadlineImpact.days_late || deadlineImpact.daysLate || 0) > 0 ? 'badge-danger' : 'badge-success'}`}>
                      {(deadlineImpact.days_late || deadlineImpact.daysLate || 0) > 0 ? `${deadlineImpact.days_late || deadlineImpact.daysLate} days late` : 'On time'}
                    </span>
                  )}
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Activity</th>
                        <th>Planned End</th>
                        <th>Delay (days)</th>
                        <th>% Complete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {delayedList.map((d) => (
                        <tr key={d.id}>
                          <td className="font-mono text-xs">{d.code}</td>
                          <td>{d.name}</td>
                          <td className="font-mono text-xs">{d.planned_end}</td>
                          <td><span className="badge badge-danger">+{d.delay_days}d</span></td>
                          <td>
                            <div className="flex items-center gap-sm">
                              <div className="progress-bar" style={{ flex: 1 }}>
                                <div className="progress-fill danger" style={{ width: `${d.percent_complete}%` }} />
                              </div>
                              <span className="text-xs font-mono">{d.percent_complete}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {cascadedList.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">Cascaded Impact on Downstream Activities ({cascadedList.length})</div>
                  </div>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Activity</th>
                          <th>New Projected Start</th>
                          <th>Cascaded Delay</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cascadedList.map((c, i) => (
                          <tr key={i}>
                            <td>{c.code} — {c.name}</td>
                            <td className="text-xs font-mono">{c.new_projected_start || c.source_code || '—'}</td>
                            <td><span className="badge badge-warning">+{c.cascaded_delay_days}d</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
