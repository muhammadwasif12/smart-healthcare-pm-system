import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import {
  LayoutDashboard, FileText, Users, Target, Network, GitBranch,
  CalendarDays, DollarSign, TrendingUp, AlertTriangle, ShieldCheck,
  Bug, CheckSquare, Milestone, ClipboardList, Clock, Archive,
  Settings, RotateCcw, Activity, ChevronRight, Menu, X, Heart,
  BarChart3, Grid3X3
} from 'lucide-react';
import { getSettings, updateSettings, getDashboard, resetDatabase } from './services/api';
import './index.css';

// Pages
import DashboardPage from './pages/Dashboard';
import CharterPage from './pages/Charter';
import PlanPage from './pages/Plan';
import TeamPage from './pages/Team';
import StakeholdersPage from './pages/Stakeholders';
import RequirementsPage from './pages/Requirements';
import WBSPage from './pages/WBS';
import ChangeRequestsPage from './pages/ChangeRequests';
import ActivitiesPage from './pages/Activities';
import SchedulePage from './pages/Schedule';
import CostPage from './pages/Cost';
import EVMPage from './pages/EVM';
import RisksPage from './pages/Risks';
import DefectsPage from './pages/Defects';
import ChecklistsPage from './pages/Checklists';
import MilestonesPage from './pages/Milestones';
import ResourcesPage from './pages/Resources';
import PDPCPage from './pages/PDPC';
import ClosurePage from './pages/Closure';
import AuditLogPage from './pages/AuditLog';
import ReportsPage from './pages/Reports';
import ResponsibilitiesPage from './pages/Responsibilities';

// Context for status date
export const AppContext = createContext();
export const useAppContext = () => useContext(AppContext);

function App() {
  const [statusDate, setStatusDate] = useState('2026-12-01');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    getSettings().then(s => {
      if (s.status_date) setStatusDate(s.status_date);
    }).catch(() => {});
  }, []);

  const handleStatusDateChange = async (newDate) => {
    setStatusDate(newDate);
    try {
      await updateSettings({ status_date: newDate });
      toast.success('Status date updated');
    } catch { toast.error('Failed to update status date'); }
  };

  const handleReset = async () => {
    if (!confirm('Reset all data to demo defaults? This cannot be undone.')) return;
    try {
      await resetDatabase();
      toast.success('Database reset to demo data');
      window.location.reload();
    } catch { toast.error('Reset failed'); }
  };

  return (
    <AppContext.Provider value={{ statusDate, setStatusDate: handleStatusDateChange }}>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          style: { background: '#0b1010', color: '#ecfdf5', border: '1px solid rgba(148,200,187,0.16)' },
          success: { iconTheme: { primary: '#34d399', secondary: '#ecfdf5' } },
          error: { iconTheme: { primary: '#fb7185', secondary: '#ecfdf5' } },
        }} />
        <div className="app-layout">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onReset={handleReset} />
          <div className="main-content">
            <TopBar
              statusDate={statusDate}
              onStatusDateChange={handleStatusDateChange}
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            />
            <div className="page-content">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/charter" element={<CharterPage />} />
                <Route path="/plan" element={<PlanPage />} />
                <Route path="/team" element={<TeamPage />} />
                <Route path="/stakeholders" element={<StakeholdersPage />} />
                <Route path="/requirements" element={<RequirementsPage />} />
                <Route path="/wbs" element={<WBSPage />} />
                <Route path="/change-requests" element={<ChangeRequestsPage />} />
                <Route path="/activities" element={<ActivitiesPage />} />
                <Route path="/schedule" element={<SchedulePage />} />
                <Route path="/cost" element={<CostPage />} />
                <Route path="/evm" element={<EVMPage />} />
                <Route path="/risks" element={<RisksPage />} />
                <Route path="/defects" element={<DefectsPage />} />
                <Route path="/checklists" element={<ChecklistsPage />} />
                <Route path="/milestones" element={<MilestonesPage />} />
                <Route path="/resources" element={<ResourcesPage />} />
                <Route path="/pdpc" element={<PDPCPage />} />
                <Route path="/closure" element={<ClosurePage />} />
                <Route path="/audit-log" element={<AuditLogPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/responsibilities" element={<ResponsibilitiesPage />} />
                <Route path="/raci" element={<ResponsibilitiesPage />} />
              </Routes>
            </div>
          </div>
        </div>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

// ──── Navigation Items ────
const navSections = [
  {
    title: 'Overview',
    items: [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/charter', icon: FileText, label: 'Project Charter' },
      { path: '/plan', icon: ClipboardList, label: 'Project Plan' },
    ],
  },
  {
    title: 'Scope',
    items: [
      { path: '/requirements', icon: Target, label: 'Requirements' },
      { path: '/wbs', icon: Network, label: 'WBS' },
      { path: '/change-requests', icon: GitBranch, label: 'Change Requests' },
    ],
  },
  {
    title: 'Schedule & Cost',
    items: [
      { path: '/activities', icon: Activity, label: 'Activities' },
      { path: '/schedule', icon: CalendarDays, label: 'Schedule & Gantt' },
      { path: '/cost', icon: DollarSign, label: 'Cost Tracking' },
      { path: '/evm', icon: TrendingUp, label: 'EVM Dashboard' },
      { path: '/milestones', icon: Milestone, label: 'Milestones' },
    ],
  },
  {
    title: 'Quality & Risk',
    items: [
      { path: '/defects', icon: Bug, label: 'Defect Tracker' },
      { path: '/checklists', icon: CheckSquare, label: 'Quality Checklists' },
      { path: '/risks', icon: AlertTriangle, label: 'Risk Register' },
      { path: '/pdpc', icon: ShieldCheck, label: 'PDPC' },
    ],
  },
  {
    title: 'Resources',
    items: [
      { path: '/team', icon: Users, label: 'Team Members' },
      { path: '/stakeholders', icon: Users, label: 'Stakeholders' },
      { path: '/resources', icon: Clock, label: 'Resource Workload' },
      { path: '/responsibilities', icon: Grid3X3, label: 'RACI Matrix' },
    ],
  },
  {
    title: 'Closure & Reports',
    items: [
      { path: '/reports', icon: BarChart3, label: 'Reports' },
      { path: '/closure', icon: Archive, label: 'Project Closure' },
      { path: '/audit-log', icon: Settings, label: 'Audit Log' },
    ],
  },
];

function Sidebar({ isOpen, onClose, onReset }) {
  return (
    <aside className="sidebar" style={{ transform: isOpen ? 'none' : 'translateX(-100%)' }}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Heart size={20} color="white" />
        </div>
        <div>
          <div className="sidebar-title">Healthcare PM</div>
          <div className="sidebar-subtitle">Project Management</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div className="nav-section" key={section.title}>
            <div className="nav-section-title">{section.title}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <item.icon className="nav-icon" size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div style={{ padding: 'var(--space-md)', borderTop: '1px solid var(--border-color)' }}>
        <button className="btn btn-ghost btn-sm w-full" onClick={onReset}>
          <RotateCcw size={14} /> Reset Demo Data
        </button>
      </div>
    </aside>
  );
}

function TopBar({ statusDate, onStatusDateChange, onToggleSidebar }) {
  const location = useLocation();
  const currentPage = navSections.flatMap(s => s.items).find(i => i.path === location.pathname);
  const title = currentPage?.label || 'Dashboard';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="btn btn-icon btn-ghost" onClick={onToggleSidebar} style={{ display: 'none' }}>
          <Menu size={20} />
        </button>
        <h1 className="topbar-title">{title}</h1>
      </div>
      <div className="topbar-right">
        <div className="status-date-picker">
          <CalendarDays size={14} style={{ color: 'var(--accent-primary-light)' }} />
          <label>Status Date</label>
          <input
            type="date"
            value={statusDate}
            onChange={(e) => onStatusDateChange(e.target.value)}
          />
        </div>
      </div>
    </header>
  );
}

export default App;
