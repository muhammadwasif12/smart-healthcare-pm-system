-- ============================================================
-- Smart Healthcare PM System — Database Schema
-- SQLite with Foreign Keys, Constraints, Indexes
-- ============================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ==================== SETTINGS & AUDIT ====================

-- Key-value settings (status date, thresholds, etc.)
CREATE TABLE IF NOT EXISTS settings (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  key   TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Audit trail for every important change
CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,          -- e.g. 'change_request', 'requirement'
  entity_id   INTEGER,                -- ID of the changed entity
  action      TEXT NOT NULL,          -- e.g. 'APPROVED', 'CREATED', 'UPDATED'
  details     TEXT,                   -- JSON with before/after or extra info
  user_name   TEXT NOT NULL DEFAULT 'System',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ==================== PROJECT CHARTER & PLAN ====================

CREATE TABLE IF NOT EXISTS project_charter (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  title            TEXT NOT NULL,
  description      TEXT,
  objectives       TEXT,              -- JSON array of objective strings
  scope_in         TEXT,              -- JSON array of in-scope items
  scope_out        TEXT,              -- JSON array of out-of-scope items
  approved_budget  REAL NOT NULL CHECK(approved_budget >= 0),
  start_date       TEXT NOT NULL,     -- YYYY-MM-DD
  end_date         TEXT NOT NULL,     -- YYYY-MM-DD
  sponsor          TEXT NOT NULL,
  project_manager  TEXT NOT NULL,
  approval_status  TEXT NOT NULL DEFAULT 'Draft'
                   CHECK(approval_status IN ('Draft','Approved','Rejected')),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK(end_date >= start_date)
);

-- Project Management Plan with notes per knowledge area
CREATE TABLE IF NOT EXISTS project_plan (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  charter_id      INTEGER REFERENCES project_charter(id),
  scope_notes     TEXT DEFAULT '',
  schedule_notes  TEXT DEFAULT '',
  cost_notes      TEXT DEFAULT '',
  quality_notes   TEXT DEFAULT '',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ==================== TEAM & STAKEHOLDERS ====================

CREATE TABLE IF NOT EXISTS team_members (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  daily_rate REAL NOT NULL CHECK(daily_rate >= 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stakeholders (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  role         TEXT NOT NULL,
  organization TEXT,
  influence    TEXT NOT NULL CHECK(influence IN ('High','Medium','Low')),
  interest     TEXT CHECK(interest IN ('High','Medium','Low')),
  contact      TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ==================== REQUIREMENTS & SCOPE ====================

CREATE TABLE IF NOT EXISTS requirements (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,       -- e.g. 'REQ-001'
  title       TEXT NOT NULL,
  description TEXT,
  type        TEXT NOT NULL DEFAULT 'Functional'
              CHECK(type IN ('Functional','Non-Functional','Technical')),
  priority    TEXT NOT NULL CHECK(priority IN ('Must','Should','Could')),
  status      TEXT NOT NULL DEFAULT 'Proposed'
              CHECK(status IN ('Proposed','Approved','Rejected','Implemented')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ==================== WBS (Hierarchical) ====================

CREATE TABLE IF NOT EXISTS wbs_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  code           TEXT NOT NULL UNIQUE,    -- e.g. '1.0', '1.3.1'
  title          TEXT NOT NULL,
  description    TEXT,
  parent_id      INTEGER REFERENCES wbs_items(id) ON DELETE SET NULL,
  level          INTEGER NOT NULL DEFAULT 0,
  requirement_id INTEGER REFERENCES requirements(id),
  is_work_package INTEGER NOT NULL DEFAULT 0,  -- 1 = leaf work package
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ==================== CHANGE REQUESTS ====================

CREATE TABLE IF NOT EXISTS change_requests (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  code                 TEXT NOT NULL UNIQUE,      -- e.g. 'CR-001'
  title                TEXT NOT NULL,
  description          TEXT,
  justification        TEXT,
  requested_by         TEXT NOT NULL,
  cost_impact          REAL NOT NULL DEFAULT 0,   -- PKR delta
  schedule_impact_weeks REAL NOT NULL DEFAULT 0,  -- weeks delta
  status               TEXT NOT NULL DEFAULT 'Submitted'
                       CHECK(status IN ('Submitted','Under Review','Approved','Rejected')),
  decision_date        TEXT,
  approver             TEXT,
  remarks              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Junction: CRs link to one or more requirements
CREATE TABLE IF NOT EXISTS change_request_requirements (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  change_request_id INTEGER NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
  requirement_id    INTEGER NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  UNIQUE(change_request_id, requirement_id)
);

-- ==================== ACTIVITIES & SCHEDULE ====================

CREATE TABLE IF NOT EXISTS activities (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  code             TEXT NOT NULL UNIQUE,     -- e.g. 'ACT-001'
  name             TEXT NOT NULL,
  wbs_item_id      INTEGER REFERENCES wbs_items(id),
  assignee_id      INTEGER REFERENCES team_members(id),
  duration         INTEGER NOT NULL CHECK(duration > 0),   -- calendar days
  planned_start    TEXT NOT NULL,            -- YYYY-MM-DD
  planned_end      TEXT NOT NULL,            -- YYYY-MM-DD
  actual_start     TEXT,
  actual_finish    TEXT,
  percent_complete INTEGER NOT NULL DEFAULT 0
                   CHECK(percent_complete >= 0 AND percent_complete <= 100),
  status           TEXT NOT NULL DEFAULT 'Not Started'
                   CHECK(status IN ('Not Started','In Progress','Completed','On Hold')),
  estimated_cost   REAL NOT NULL DEFAULT 0 CHECK(estimated_cost >= 0),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK(planned_end >= planned_start)
);

-- Dependencies between activities (FS with optional lag)
CREATE TABLE IF NOT EXISTS activity_dependencies (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id     INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  predecessor_id  INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL DEFAULT 'FS'
                  CHECK(dependency_type IN ('FS','SS','FF','SF')),
  lag_days        INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK(activity_id != predecessor_id),
  UNIQUE(activity_id, predecessor_id)
);

-- ==================== MILESTONES & RESPONSIBILITIES ====================

CREATE TABLE IF NOT EXISTS milestones (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  planned_date TEXT NOT NULL,
  actual_date  TEXT,
  status       TEXT NOT NULL DEFAULT 'Not Started'
               CHECK(status IN ('Not Started','In Progress','Completed')),
  description  TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Junction: milestones link to activities
CREATE TABLE IF NOT EXISTS milestone_activities (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  milestone_id INTEGER NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  activity_id  INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  UNIQUE(milestone_id, activity_id)
);

-- RACI matrix: member × deliverable
CREATE TABLE IF NOT EXISTS responsibilities (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  team_member_id      INTEGER NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  deliverable         TEXT NOT NULL,
  responsibility_type TEXT NOT NULL CHECK(responsibility_type IN ('R','A','C','I')),
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(team_member_id, deliverable, responsibility_type)
);

-- ==================== COST & EVM ====================

-- Actual cost entries per activity
CREATE TABLE IF NOT EXISTS expenses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  date        TEXT NOT NULL,
  amount      REAL NOT NULL CHECK(amount > 0),
  description TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Dated progress history used by EVM earned value calculations
CREATE TABLE IF NOT EXISTS progress_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id     INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  date            TEXT NOT NULL,
  percent_complete INTEGER NOT NULL CHECK(percent_complete >= 0 AND percent_complete <= 100),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(activity_id, date)
);

-- EVM snapshots for trend analysis
CREATE TABLE IF NOT EXISTS evm_snapshots (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_date TEXT NOT NULL,
  bac           REAL NOT NULL,
  pv            REAL NOT NULL,
  ev            REAL NOT NULL,
  ac            REAL NOT NULL,
  cv            REAL NOT NULL,
  sv            REAL NOT NULL,
  cpi           REAL,
  spi           REAL,
  eac           REAL,
  etc_val       REAL,
  vac           REAL,
  tcpi          REAL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ==================== QUALITY ====================

-- Defect tracker
CREATE TABLE IF NOT EXISTS defects (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  code          TEXT NOT NULL UNIQUE,      -- e.g. 'DEF-001'
  title         TEXT NOT NULL,
  description   TEXT,
  activity_id   INTEGER REFERENCES activities(id),
  wbs_item_id   INTEGER REFERENCES wbs_items(id),
  severity      TEXT NOT NULL CHECK(severity IN ('Critical','High','Medium','Low')),
  assignee_id   INTEGER REFERENCES team_members(id),
  status        TEXT NOT NULL DEFAULT 'Open'
                CHECK(status IN ('Open','In Progress','Resolved','Verified','Closed')),
  reported_date TEXT NOT NULL,
  resolved_date TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Quality checklists per deliverable
CREATE TABLE IF NOT EXISTS quality_checklists (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  wbs_item_id INTEGER REFERENCES wbs_items(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Individual check items within a checklist
CREATE TABLE IF NOT EXISTS checklist_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  checklist_id INTEGER NOT NULL REFERENCES quality_checklists(id) ON DELETE CASCADE,
  description  TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Inspection/test results for each check item
CREATE TABLE IF NOT EXISTS inspection_results (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  checklist_item_id INTEGER NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  result            TEXT NOT NULL CHECK(result IN ('Pass','Fail','Not Tested')),
  tester_id         INTEGER REFERENCES team_members(id),
  test_date         TEXT NOT NULL,
  remarks           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ==================== RISK & PDPC ====================

-- Risk register with likelihood × impact scoring
CREATE TABLE IF NOT EXISTS risks (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  code             TEXT NOT NULL UNIQUE,
  title            TEXT NOT NULL,
  description      TEXT,
  category         TEXT,
  likelihood       INTEGER NOT NULL CHECK(likelihood >= 1 AND likelihood <= 5),
  impact           INTEGER NOT NULL CHECK(impact >= 1 AND impact <= 5),
  score            INTEGER NOT NULL DEFAULT 0,   -- computed as likelihood * impact
  status           TEXT NOT NULL DEFAULT 'Open'
                   CHECK(status IN ('Open','Mitigated','Closed')),
  owner_id         INTEGER REFERENCES team_members(id),
  mitigation_plan  TEXT,
  contingency_plan TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- PDPC tree nodes (Objective → Activity → Problem → Preventive/Corrective)
CREATE TABLE IF NOT EXISTS pdpc_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id   INTEGER REFERENCES pdpc_items(id) ON DELETE CASCADE,
  node_type   TEXT NOT NULL
              CHECK(node_type IN ('objective','activity','problem','preventive','corrective')),
  title       TEXT NOT NULL,
  description TEXT,
  risk_id     INTEGER REFERENCES risks(id),
  color       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ==================== PROJECT CLOSURE ====================

CREATE TABLE IF NOT EXISTS project_closure (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  charter_id      INTEGER REFERENCES project_charter(id),
  final_cost      REAL,
  actual_end_date TEXT,
  lessons_learned TEXT,
  sign_off_by     TEXT,
  sign_off_date   TEXT,
  status          TEXT NOT NULL DEFAULT 'Draft'
                  CHECK(status IN ('Draft','Pending Review','Signed Off')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ==================== INDEXES ====================

CREATE INDEX IF NOT EXISTS idx_activities_wbs        ON activities(wbs_item_id);
CREATE INDEX IF NOT EXISTS idx_activities_assignee    ON activities(assignee_id);
CREATE INDEX IF NOT EXISTS idx_activities_status      ON activities(status);
CREATE INDEX IF NOT EXISTS idx_expenses_activity      ON expenses(activity_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date          ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_progress_log_activity_date ON progress_log(activity_id, date);
CREATE INDEX IF NOT EXISTS idx_defects_severity       ON defects(severity);
CREATE INDEX IF NOT EXISTS idx_defects_status         ON defects(status);
CREATE INDEX IF NOT EXISTS idx_wbs_parent             ON wbs_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_requirements_status    ON requirements(status);
CREATE INDEX IF NOT EXISTS idx_cr_status              ON change_requests(status);
CREATE INDEX IF NOT EXISTS idx_audit_entity           ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_pdpc_parent            ON pdpc_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_activity_deps          ON activity_dependencies(activity_id, predecessor_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_list   ON checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_inspection_item        ON inspection_results(checklist_item_id);
CREATE INDEX IF NOT EXISTS idx_risks_score            ON risks(score);
CREATE INDEX IF NOT EXISTS idx_evm_date               ON evm_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_milestone_acts         ON milestone_activities(milestone_id);
CREATE INDEX IF NOT EXISTS idx_cr_reqs                ON change_request_requirements(change_request_id);
