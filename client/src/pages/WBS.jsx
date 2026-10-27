import { useState, useEffect } from 'react';
import { getWBS } from '../services/api';
import { Network, ChevronRight, ChevronDown, Package } from 'lucide-react';

export default function WBSPage() {
  const [wbs, setWbs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(new Set());

  useEffect(() => {
    getWBS().then(w => { setWbs(w); setExpanded(new Set(w.filter(i => !i.parent_id).map(i => i.id))); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const toggle = (id) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  const getChildren = (parentId) => wbs.filter(i => i.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order);
  const topLevel = wbs.filter(i => !i.parent_id).sort((a, b) => a.sort_order - b.sort_order);

  const renderNode = (item, depth = 0) => {
    const children = getChildren(item.id);
    const isExpanded = expanded.has(item.id);
    const hasChildren = children.length > 0;

    return (
      <div key={item.id}>
        <div
          className="flex items-center gap-sm"
          style={{
            padding: '8px 12px', paddingLeft: `${12 + depth * 24}px`,
            borderBottom: '1px solid var(--border-glass)',
            cursor: hasChildren ? 'pointer' : 'default',
            transition: 'background 0.15s',
            background: depth === 0 ? 'rgba(16,185,129,0.06)' : 'transparent'
          }}
          onClick={() => hasChildren && toggle(item.id)}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = depth === 0 ? 'rgba(16,185,129,0.06)' : 'transparent'}
        >
          {hasChildren ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span style={{ width: 14 }} />}
          {item.is_work_package ? <Package size={14} style={{ color: 'var(--accent-emerald)' }} /> : <Network size={14} style={{ color: 'var(--accent-primary-light)', opacity: 0.6 }} />}
          <span className="font-mono text-xs text-muted" style={{ minWidth: 50 }}>{item.code}</span>
          <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: depth === 0 ? 600 : 400 }}>{item.title}</span>
          {item.is_work_package && <span className="badge badge-success" style={{ fontSize: '0.6rem' }}>WP</span>}
          {item.requirement_code && <span className="badge badge-primary" style={{ fontSize: '0.6rem' }}>{item.requirement_code}</span>}
        </div>
        {isExpanded && children.map(c => renderNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><Network size={24} /> Work Breakdown Structure</h2>
          <p className="page-subtitle">{wbs.length} items • {wbs.filter(i => i.is_work_package).length} work packages</p>
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: 'rgba(30,41,59,0.6)', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '2rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          <span style={{ flex: 1 }}>Work Breakdown Structure</span>
          <span>Type</span>
          <span>Requirement</span>
        </div>
        {topLevel.map(item => renderNode(item))}
      </div>
    </div>
  );
}
