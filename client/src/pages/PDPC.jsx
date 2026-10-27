import { useState, useEffect } from 'react';
import { getPDPC } from '../services/api';
import { ShieldCheck, ChevronDown, ChevronRight, Target, AlertTriangle, Shield, Wrench } from 'lucide-react';

export default function PDPCPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(new Set());

  useEffect(() => {
    getPDPC().then(p => { setItems(p); setExpanded(new Set(p.filter(i => i.node_type === 'objective').map(i => i.id))); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const toggle = (id) => { const n = new Set(expanded); n.has(id) ? n.delete(id) : n.add(id); setExpanded(n); };
  const getChildren = (parentId) => items.filter(i => i.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order);
  const objectives = items.filter(i => i.node_type === 'objective').sort((a, b) => a.sort_order - b.sort_order);

  const nodeColors = {
    objective: { bg: 'rgba(16,185,129,0.15)', border: 'var(--accent-primary)', icon: <Target size={16} color="#34d399" /> },
    activity: { bg: 'rgba(6,182,212,0.12)', border: 'var(--accent-cyan)', icon: <Shield size={16} color="#06b6d4" /> },
    problem: { bg: 'rgba(245,158,11,0.12)', border: 'var(--accent-amber)', icon: <AlertTriangle size={16} color="#f59e0b" /> },
    action: { bg: 'rgba(16,185,129,0.12)', border: 'var(--accent-emerald)', icon: <Wrench size={16} color="#10b981" /> },
  };

  const renderNode = (item, depth = 0) => {
    const children = getChildren(item.id);
    const isExpanded = expanded.has(item.id);
    const hasChildren = children.length > 0;
    const colors = nodeColors[item.node_type] || nodeColors.objective;

    return (
      <div key={item.id} style={{ marginBottom: depth === 0 ? 'var(--space-lg)' : 2 }}>
        <div
          onClick={() => hasChildren && toggle(item.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
            marginLeft: depth * 28, borderRadius: 8, cursor: hasChildren ? 'pointer' : 'default',
            background: colors.bg, borderLeft: `3px solid ${colors.border}`,
            transition: 'all 0.15s',
          }}
        >
          {hasChildren ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span style={{ width: 14 }} />}
          {colors.icon}
          <span style={{ fontSize: '0.8rem', fontWeight: depth === 0 ? 600 : 400, flex: 1 }}>{item.title}</span>
          <span className="badge badge-neutral" style={{ fontSize: '0.6rem' }}>{item.node_type}</span>
          {item.risk_code && <span className="badge badge-warning" style={{ fontSize: '0.6rem' }}>{item.risk_code}</span>}
          {item.effectiveness && <span className={`badge ${item.effectiveness === 'Effective' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.6rem' }}>{item.effectiveness}</span>}
        </div>
        {isExpanded && children.map(c => renderNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><ShieldCheck size={24} /> Process Decision Program Chart</h2>
          <p className="page-subtitle">Objective → Activity → Potential Problem → Preventive/Corrective Action</p>
        </div>
        <button className="btn btn-ghost" onClick={() => setExpanded(new Set(items.map(i => i.id)))}>Expand All</button>
      </div>
      <div className="card">
        {objectives.map(obj => renderNode(obj))}
      </div>
    </div>
  );
}
