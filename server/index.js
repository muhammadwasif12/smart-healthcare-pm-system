/**
 * Express Server — server/index.js
 *
 * Main entry point. Initializes the database on startup, mounts all API
 * routes, serves the built React client in production, and applies
 * global middleware (CORS, JSON parsing, error handling).
 */

const express      = require('express');
const cors         = require('cors');
const path         = require('path');
const { initDatabase, resetDatabase } = require('./db/init');
const { getDb }    = require('./db/connection');
const errorHandler = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3001;

// ──── Global Middleware ────
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ──── Health check ────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ──── Reset Demo Data endpoint ────
app.post('/api/reset', async (req, res, next) => {
  try {
    await resetDatabase();
    res.json({ message: 'Database reset to demo data successfully' });
  } catch (err) { next(err); }
});

// ──── Settings (status date, thresholds) ────
app.get('/api/settings', async (req, res, next) => {
  try {
    const db = await getDb();
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const r of rows) settings[r.key] = r.value;
    res.json(settings);
  } catch (err) { next(err); }
});

app.put('/api/settings', async (req, res, next) => {
  try {
    const db = await getDb();
    const updates = req.body; // { key: value, ... }
    for (const [key, value] of Object.entries(updates)) {
      const existing = db.prepare('SELECT id FROM settings WHERE key = ?').get(key);
      if (existing) {
        db.prepare('UPDATE settings SET value = ?, updated_at = datetime(\'now\') WHERE key = ?').run(String(value), key);
      } else {
        db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
      }
    }
    // Return updated settings
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const r of rows) settings[r.key] = r.value;
    res.json(settings);
  } catch (err) { next(err); }
});

// ──── Project Charter ────
app.get('/api/charter', async (req, res, next) => {
  try {
    const db = await getDb();
    const charter = db.prepare('SELECT * FROM project_charter LIMIT 1').get();
    if (!charter) return res.status(404).json({ error: true, message: 'No charter found' });
    const parseList = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      try { const p = JSON.parse(val); return Array.isArray(p) ? p : [String(p)]; }
      catch { return String(val).split('\n').map(s => s.trim()).filter(Boolean); }
    };
    charter.objectives = parseList(charter.objectives);
    charter.scope_in   = parseList(charter.scope_in);
    charter.scope_out  = parseList(charter.scope_out);
    res.json(charter);
  } catch (err) { next(err); }
});

app.put('/api/charter', async (req, res, next) => {
  try {
    const db = await getDb();
    const b = req.body;
    const charter = db.prepare('SELECT * FROM project_charter LIMIT 1').get();
    if (!charter) return res.status(404).json({ error: true, message: 'No charter found' });

    const formatList = (newVal, oldVal) => {
      if (newVal === undefined || newVal === null) return oldVal || '[]';
      if (Array.isArray(newVal)) return JSON.stringify(newVal);
      if (typeof newVal === 'string') {
        try {
          const parsed = JSON.parse(newVal);
          if (Array.isArray(parsed)) return JSON.stringify(parsed);
        } catch {}
        return JSON.stringify(newVal.split('\n').map(s => s.trim()).filter(Boolean));
      }
      return JSON.stringify([newVal]);
    };

    db.prepare(`
      UPDATE project_charter SET
        title = ?, description = ?, objectives = ?, scope_in = ?, scope_out = ?,
        approved_budget = ?, start_date = ?, end_date = ?, sponsor = ?,
        project_manager = ?, approval_status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      b.title || charter.title,
      b.description ?? charter.description,
      formatList(b.objectives, charter.objectives),
      formatList(b.scope_in, charter.scope_in),
      formatList(b.scope_out, charter.scope_out),
      b.approved_budget ?? charter.approved_budget,
      b.start_date || charter.start_date,
      b.end_date || charter.end_date,
      b.sponsor || charter.sponsor,
      b.project_manager || charter.project_manager,
      b.approval_status || charter.approval_status,
      charter.id
    );

    db.prepare(`INSERT INTO audit_log (entity_type, entity_id, action, details, user_name)
      VALUES ('project_charter', ?, 'UPDATED', ?, 'System')
    `).run(charter.id, JSON.stringify({ fields: Object.keys(b) }));

    const updated = db.prepare('SELECT * FROM project_charter WHERE id = ?').get(charter.id);
    const parseList = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      try { const p = JSON.parse(val); return Array.isArray(p) ? p : [String(p)]; }
      catch { return String(val).split('\n').map(s => s.trim()).filter(Boolean); }
    };
    updated.objectives = parseList(updated.objectives);
    updated.scope_in   = parseList(updated.scope_in);
    updated.scope_out  = parseList(updated.scope_out);
    res.json(updated);
  } catch (err) { next(err); }
});

// ──── Project Plan ────
app.get('/api/plan', async (req, res, next) => {
  try {
    const db = await getDb();
    const plan = db.prepare('SELECT * FROM project_plan LIMIT 1').get();
    // Also pull live data for auto-populated sections
    const approvedReqs = db.prepare("SELECT COUNT(*) as cnt FROM requirements WHERE status IN ('Approved','Implemented')").get();
    const wbsCount     = db.prepare("SELECT COUNT(*) as cnt FROM wbs_items WHERE is_work_package = 1").get();
    const charter      = db.prepare("SELECT end_date, approved_budget FROM project_charter LIMIT 1").get();
    const passRate     = db.prepare(`
      SELECT 
        COUNT(CASE WHEN ir.result = 'Pass' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(CASE WHEN ir.result IN ('Pass','Fail') THEN 1 END), 0) as rate
      FROM inspection_results ir
    `).get();

    res.json({
      ...plan,
      liveData: {
        approved_requirements_count: approvedReqs?.cnt || 0,
        wbs_work_packages: wbsCount?.cnt || 0,
        project_end_date: charter?.end_date,
        approved_budget: charter?.approved_budget,
        checklist_pass_rate: passRate?.rate ? Math.round(passRate.rate * 10) / 10 : null,
      }
    });
  } catch (err) { next(err); }
});

app.put('/api/plan', async (req, res, next) => {
  try {
    const db = await getDb();
    const b = req.body;
    db.prepare(`
      UPDATE project_plan SET
        scope_notes = COALESCE(?, scope_notes),
        schedule_notes = COALESCE(?, schedule_notes),
        cost_notes = COALESCE(?, cost_notes),
        quality_notes = COALESCE(?, quality_notes),
        updated_at = datetime('now')
      WHERE id = 1
    `).run(b.scope_notes, b.schedule_notes, b.cost_notes, b.quality_notes);
    const plan = db.prepare('SELECT * FROM project_plan WHERE id = 1').get();
    res.json(plan);
  } catch (err) { next(err); }
});

// ──── Team Members ────
app.get('/api/team', async (req, res, next) => {
  try {
    const db = await getDb();
    res.json(db.prepare('SELECT * FROM team_members ORDER BY id').all());
  } catch (err) { next(err); }
});

app.post('/api/team', async (req, res, next) => {
  try {
    const db = await getDb();
    const { name, role, email, phone, daily_rate } = req.body;
    if (!name || !role) return res.status(400).json({ error: true, message: 'Name and role are required' });
    const result = db.prepare(
      'INSERT INTO team_members (name, role, email, phone, daily_rate) VALUES (?, ?, ?, ?, ?)'
    ).run(name, role, email || null, phone || null, daily_rate || 0);
    const member = db.prepare('SELECT * FROM team_members WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(member);
  } catch (err) { next(err); }
});

app.put('/api/team/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const { name, role, email, phone, daily_rate } = req.body;
    db.prepare(`
      UPDATE team_members SET name=COALESCE(?,name), role=COALESCE(?,role),
      email=COALESCE(?,email), phone=COALESCE(?,phone), daily_rate=COALESCE(?,daily_rate)
      WHERE id=?
    `).run(name, role, email, phone, daily_rate, req.params.id);
    res.json(db.prepare('SELECT * FROM team_members WHERE id = ?').get(req.params.id));
  } catch (err) { next(err); }
});

app.delete('/api/team/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    // Check references
    const ref = db.prepare('SELECT id FROM activities WHERE assignee_id = ? LIMIT 1').get(req.params.id);
    if (ref) return res.status(409).json({ error: true, message: 'Cannot delete: team member is assigned to activities' });
    db.prepare('DELETE FROM team_members WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// ──── Stakeholders ────
app.get('/api/stakeholders', async (req, res, next) => {
  try {
    const db = await getDb();
    res.json(db.prepare('SELECT * FROM stakeholders ORDER BY id').all());
  } catch (err) { next(err); }
});

app.post('/api/stakeholders', async (req, res, next) => {
  try {
    const db = await getDb();
    const { name, role, organization, influence, interest, contact } = req.body;
    if (!name || !role || !influence) return res.status(400).json({ error: true, message: 'Name, role, and influence are required' });
    const result = db.prepare(
      'INSERT INTO stakeholders (name, role, organization, influence, interest, contact) VALUES (?,?,?,?,?,?)'
    ).run(name, role, organization || null, influence, interest || null, contact || null);
    res.status(201).json(db.prepare('SELECT * FROM stakeholders WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) { next(err); }
});

app.put('/api/stakeholders/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const { name, role, organization, influence, interest, contact } = req.body;
    db.prepare(`UPDATE stakeholders SET name=COALESCE(?,name), role=COALESCE(?,role),
      organization=COALESCE(?,organization), influence=COALESCE(?,influence),
      interest=COALESCE(?,interest), contact=COALESCE(?,contact) WHERE id=?`
    ).run(name, role, organization, influence, interest, contact, req.params.id);
    res.json(db.prepare('SELECT * FROM stakeholders WHERE id = ?').get(req.params.id));
  } catch (err) { next(err); }
});

app.delete('/api/stakeholders/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    db.prepare('DELETE FROM stakeholders WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// ──── Requirements ────
app.get('/api/requirements', async (req, res, next) => {
  try {
    const db = await getDb();
    let query = 'SELECT * FROM requirements';
    const params = [];
    if (req.query.status) {
      query += ' WHERE status = ?';
      params.push(req.query.status);
    }
    query += ' ORDER BY id';
    res.json(db.prepare(query).all(...params));
  } catch (err) { next(err); }
});

app.post('/api/requirements', async (req, res, next) => {
  try {
    const db = await getDb();
    const { code, title, description, type, priority, status } = req.body;
    if (!code || !title || !priority) return res.status(400).json({ error: true, message: 'Code, title, and priority are required' });
    const result = db.prepare(
      'INSERT INTO requirements (code, title, description, type, priority, status) VALUES (?,?,?,?,?,?)'
    ).run(code, title, description || null, type || 'Functional', priority, status || 'Proposed');
    const req_ = db.prepare('SELECT * FROM requirements WHERE id = ?').get(result.lastInsertRowid);
    db.prepare("INSERT INTO audit_log (entity_type, entity_id, action, details, user_name) VALUES ('requirement', ?, 'CREATED', ?, 'System')")
      .run(req_.id, JSON.stringify({ code, title, status: req_.status }));
    res.status(201).json(req_);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      err.status = 409; err.message = 'Requirement code already exists';
    }
    next(err);
  }
});

app.put('/api/requirements/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const { title, description, type, priority, status } = req.body;
    db.prepare(`UPDATE requirements SET title=COALESCE(?,title), description=COALESCE(?,description),
      type=COALESCE(?,type), priority=COALESCE(?,priority), status=COALESCE(?,status),
      updated_at=datetime('now') WHERE id=?`
    ).run(title, description, type, priority, status, req.params.id);
    res.json(db.prepare('SELECT * FROM requirements WHERE id = ?').get(req.params.id));
  } catch (err) { next(err); }
});

app.put('/api/requirements/:id/approve', async (req, res, next) => {
  try {
    const db = await getDb();
    db.prepare("UPDATE requirements SET status='Approved', updated_at=datetime('now') WHERE id=?").run(req.params.id);
    db.prepare("INSERT INTO audit_log (entity_type, entity_id, action, details, user_name) VALUES ('requirement', ?, 'APPROVED', '{}', 'System')").run(req.params.id);
    res.json(db.prepare('SELECT * FROM requirements WHERE id = ?').get(req.params.id));
  } catch (err) { next(err); }
});

app.put('/api/requirements/:id/reject', async (req, res, next) => {
  try {
    const db = await getDb();
    db.prepare("UPDATE requirements SET status='Rejected', updated_at=datetime('now') WHERE id=?").run(req.params.id);
    res.json(db.prepare('SELECT * FROM requirements WHERE id = ?').get(req.params.id));
  } catch (err) { next(err); }
});

app.delete('/api/requirements/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const ref = db.prepare('SELECT id FROM wbs_items WHERE requirement_id = ? LIMIT 1').get(req.params.id);
    if (ref) return res.status(409).json({ error: true, message: 'Cannot delete: requirement is linked to WBS items' });
    db.prepare('DELETE FROM requirements WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// ──── WBS Items ────
const { validateScopeLink } = require('./services/changeRequest');

app.get('/api/wbs', async (req, res, next) => {
  try {
    const db = await getDb();
    const items = db.prepare(`
      SELECT w.*, r.code as req_code, r.title as req_title, r.status as req_status
      FROM wbs_items w LEFT JOIN requirements r ON w.requirement_id = r.id
      ORDER BY w.sort_order, w.code
    `).all();
    res.json(items);
  } catch (err) { next(err); }
});

app.post('/api/wbs', async (req, res, next) => {
  try {
    const db = await getDb();
    const { code, title, description, parent_id, level, requirement_id, is_work_package, sort_order } = req.body;
    if (!code || !title) return res.status(400).json({ error: true, message: 'Code and title are required' });

    // Scope check: reject linking to unapproved requirement
    if (requirement_id) {
      const scopeErr = await validateScopeLink(requirement_id);
      if (scopeErr) return res.status(409).json({ error: true, message: scopeErr });
    }

    const result = db.prepare(
      'INSERT INTO wbs_items (code, title, description, parent_id, level, requirement_id, is_work_package, sort_order) VALUES (?,?,?,?,?,?,?,?)'
    ).run(code, title, description || null, parent_id || null, level || 0, requirement_id || null, is_work_package ? 1 : 0, sort_order || 0);
    res.status(201).json(db.prepare('SELECT * FROM wbs_items WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) { err.status = 409; err.message = 'WBS code already exists'; }
    next(err);
  }
});

app.put('/api/wbs/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const { code, title, description, parent_id, level, requirement_id, is_work_package, sort_order } = req.body;

    if (requirement_id) {
      const scopeErr = await validateScopeLink(requirement_id);
      if (scopeErr) return res.status(409).json({ error: true, message: scopeErr });
    }

    db.prepare(`UPDATE wbs_items SET code=COALESCE(?,code), title=COALESCE(?,title),
      description=COALESCE(?,description), parent_id=COALESCE(?,parent_id), level=COALESCE(?,level),
      requirement_id=COALESCE(?,requirement_id), is_work_package=COALESCE(?,is_work_package),
      sort_order=COALESCE(?,sort_order) WHERE id=?`
    ).run(code, title, description, parent_id, level, requirement_id, is_work_package != null ? (is_work_package ? 1 : 0) : null, sort_order, req.params.id);
    res.json(db.prepare('SELECT * FROM wbs_items WHERE id = ?').get(req.params.id));
  } catch (err) { next(err); }
});

app.delete('/api/wbs/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const ref = db.prepare('SELECT id FROM activities WHERE wbs_item_id = ? LIMIT 1').get(req.params.id);
    if (ref) return res.status(409).json({ error: true, message: 'Cannot delete: WBS item has linked activities' });
    const children = db.prepare('SELECT id FROM wbs_items WHERE parent_id = ? LIMIT 1').get(req.params.id);
    if (children) return res.status(409).json({ error: true, message: 'Cannot delete: WBS item has children' });
    db.prepare('DELETE FROM wbs_items WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

app.post('/api/wbs/generate', async (req, res, next) => {
  try {
    const db = await getDb();
    const approved = db.prepare("SELECT * FROM requirements WHERE status IN ('Approved','Implemented') ORDER BY id").all();
    const existing = db.prepare("SELECT requirement_id FROM wbs_items WHERE requirement_id IS NOT NULL").all();
    const existingReqIds = new Set(existing.map(e => e.requirement_id));
    const root = db.prepare("SELECT id FROM wbs_items WHERE parent_id IS NULL LIMIT 1").get();
    const parentId = root ? root.id : null;
    let count = 0;
    for (const req_ of approved) {
      if (existingReqIds.has(req_.id)) continue;
      const maxSort = db.prepare("SELECT MAX(sort_order) as mx FROM wbs_items").get();
      const code = `1.7.${count + 1}`;
      db.prepare('INSERT INTO wbs_items (code, title, description, parent_id, level, requirement_id, is_work_package, sort_order) VALUES (?,?,?,?,?,?,1,?)')
        .run(code, req_.title, `Auto-generated from ${req_.code}`, parentId, 2, req_.id, (maxSort?.mx || 0) + 1);
      count++;
    }
    res.json({ message: `Generated ${count} WBS items from approved requirements`, count });
  } catch (err) { next(err); }
});

// ──── Change Requests ────
const { approveChangeRequest, rejectChangeRequest } = require('./services/changeRequest');

app.get('/api/change-requests', async (req, res, next) => {
  try {
    const db = await getDb();
    const crs = db.prepare('SELECT * FROM change_requests ORDER BY id').all();
    // Attach linked requirements
    for (const cr of crs) {
      cr.requirements = db.prepare(`
        SELECT r.* FROM requirements r
        JOIN change_request_requirements crr ON crr.requirement_id = r.id
        WHERE crr.change_request_id = ?
      `).all(cr.id);
    }
    res.json(crs);
  } catch (err) { next(err); }
});

app.get('/api/change-requests/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const cr = db.prepare('SELECT * FROM change_requests WHERE id = ?').get(req.params.id);
    if (!cr) return res.status(404).json({ error: true, message: 'Change request not found' });
    cr.requirements = db.prepare(`
      SELECT r.* FROM requirements r
      JOIN change_request_requirements crr ON crr.requirement_id = r.id
      WHERE crr.change_request_id = ?
    `).all(cr.id);
    res.json(cr);
  } catch (err) { next(err); }
});

app.post('/api/change-requests', async (req, res, next) => {
  try {
    const db = await getDb();
    const { code, title, description, justification, requested_by, cost_impact, schedule_impact_weeks, requirement_ids } = req.body;
    if (!code || !title || !requested_by) return res.status(400).json({ error: true, message: 'Code, title, and requested_by are required' });
    const result = db.prepare(
      'INSERT INTO change_requests (code, title, description, justification, requested_by, cost_impact, schedule_impact_weeks) VALUES (?,?,?,?,?,?,?)'
    ).run(code, title, description || null, justification || null, requested_by, cost_impact || 0, schedule_impact_weeks || 0);
    const crId = result.lastInsertRowid;
    if (requirement_ids && requirement_ids.length) {
      for (const rid of requirement_ids) {
        db.prepare('INSERT INTO change_request_requirements (change_request_id, requirement_id) VALUES (?,?)').run(crId, rid);
      }
    }
    const cr = db.prepare('SELECT * FROM change_requests WHERE id = ?').get(crId);
    res.status(201).json(cr);
  } catch (err) { next(err); }
});

const handleApproveCR = async (req, res, next) => {
  try {
    const result = await approveChangeRequest(
      parseInt(req.params.id),
      req.body.approver || 'Project Manager',
      req.body.remarks || ''
    );
    res.json(result);
  } catch (err) { next(err); }
};
app.put('/api/change-requests/:id/approve', handleApproveCR);
app.post('/api/change-requests/:id/approve', handleApproveCR);

const handleRejectCR = async (req, res, next) => {
  try {
    const result = await rejectChangeRequest(
      parseInt(req.params.id),
      req.body.approver || 'Project Manager',
      req.body.remarks || ''
    );
    res.json(result);
  } catch (err) { next(err); }
};
app.put('/api/change-requests/:id/reject', handleRejectCR);
app.post('/api/change-requests/:id/reject', handleRejectCR);

// ──── Activities ────
const { runScheduler, validateDependency } = require('./services/scheduler');

app.get('/api/activities', async (req, res, next) => {
  try {
    const db = await getDb();
    const activities = db.prepare(`
      SELECT a.*, t.name as assignee_name, w.code as wbs_code, w.title as wbs_title
      FROM activities a
      LEFT JOIN team_members t ON a.assignee_id = t.id
      LEFT JOIN wbs_items w ON a.wbs_item_id = w.id
      ORDER BY a.id
    `).all();
    res.json(activities);
  } catch (err) { next(err); }
});

app.get('/api/activities/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const activity = db.prepare(`
      SELECT a.*, t.name as assignee_name, w.code as wbs_code
      FROM activities a
      LEFT JOIN team_members t ON a.assignee_id = t.id
      LEFT JOIN wbs_items w ON a.wbs_item_id = w.id
      WHERE a.id = ?
    `).get(req.params.id);
    if (!activity) return res.status(404).json({ error: true, message: 'Activity not found' });
    // Attach dependencies
    activity.predecessors = db.prepare(`
      SELECT ad.*, a.code as predecessor_code, a.name as predecessor_name
      FROM activity_dependencies ad
      JOIN activities a ON ad.predecessor_id = a.id
      WHERE ad.activity_id = ?
    `).all(req.params.id);
    activity.successors = db.prepare(`
      SELECT ad.*, a.code as successor_code, a.name as successor_name
      FROM activity_dependencies ad
      JOIN activities a ON ad.activity_id = a.id
      WHERE ad.predecessor_id = ?
    `).all(req.params.id);
    res.json(activity);
  } catch (err) { next(err); }
});

app.post('/api/activities', async (req, res, next) => {
  try {
    const db = await getDb();
    const b = req.body;
    if (!b.code || !b.name || !b.duration || !b.planned_start || !b.planned_end) {
      return res.status(400).json({ error: true, message: 'Code, name, duration, planned_start, and planned_end are required' });
    }
    if (b.planned_end < b.planned_start) return res.status(400).json({ error: true, message: 'planned_end must be >= planned_start' });

    // Scope check via WBS link
    if (b.wbs_item_id) {
      const wbs = db.prepare('SELECT requirement_id FROM wbs_items WHERE id = ?').get(b.wbs_item_id);
      if (wbs && wbs.requirement_id) {
        const scopeErr = await validateScopeLink(wbs.requirement_id);
        if (scopeErr) return res.status(409).json({ error: true, message: scopeErr });
      }
    }

    const result = db.prepare(`
      INSERT INTO activities (code, name, wbs_item_id, assignee_id, duration, planned_start, planned_end,
        actual_start, actual_finish, percent_complete, status, estimated_cost)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(b.code, b.name, b.wbs_item_id || null, b.assignee_id || null, b.duration,
      b.planned_start, b.planned_end, b.actual_start || null, b.actual_finish || null,
      b.percent_complete || 0, b.status || 'Not Started', b.estimated_cost || 0);
    res.status(201).json(db.prepare('SELECT * FROM activities WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) { err.status = 409; err.message = 'Activity code already exists'; }
    next(err);
  }
});

app.put('/api/activities/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const b = req.body;
    const existing = db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: true, message: 'Activity not found' });

    db.prepare(`
      UPDATE activities SET name=COALESCE(?,name), wbs_item_id=COALESCE(?,wbs_item_id),
      assignee_id=COALESCE(?,assignee_id), duration=COALESCE(?,duration),
      planned_start=COALESCE(?,planned_start), planned_end=COALESCE(?,planned_end),
      actual_start=COALESCE(?,actual_start), actual_finish=COALESCE(?,actual_finish),
      percent_complete=COALESCE(?,percent_complete), status=COALESCE(?,status),
      estimated_cost=COALESCE(?,estimated_cost), updated_at=datetime('now')
      WHERE id=?
    `).run(b.name, b.wbs_item_id, b.assignee_id, b.duration,
      b.planned_start, b.planned_end, b.actual_start, b.actual_finish,
      b.percent_complete, b.status, b.estimated_cost, req.params.id);
    if (b.percent_complete !== undefined) {
      const statusDateRow = db.prepare("SELECT value FROM settings WHERE key = 'status_date'").get();
      const progressDate = statusDateRow ? statusDateRow.value : '2026-12-01';
      db.prepare(`
        INSERT INTO progress_log (activity_id, date, percent_complete)
        VALUES (?, ?, ?)
        ON CONFLICT(activity_id, date) DO UPDATE SET percent_complete = excluded.percent_complete
      `).run(req.params.id, progressDate, b.percent_complete);
    }
    res.json(db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id));
  } catch (err) { next(err); }
});

app.delete('/api/activities/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const ref = db.prepare('SELECT id FROM expenses WHERE activity_id = ? LIMIT 1').get(req.params.id);
    if (ref) return res.status(409).json({ error: true, message: 'Cannot delete: activity has expense records' });
    db.prepare('DELETE FROM activity_dependencies WHERE activity_id = ? OR predecessor_id = ?').run(req.params.id, req.params.id);
    db.prepare('DELETE FROM activities WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// ──── Dependencies ────
app.get('/api/dependencies', async (req, res, next) => {
  try {
    const db = await getDb();
    res.json(db.prepare(`
      SELECT ad.*, 
        a1.code as activity_code, a1.name as activity_name,
        a2.code as predecessor_code, a2.name as predecessor_name
      FROM activity_dependencies ad
      JOIN activities a1 ON ad.activity_id = a1.id
      JOIN activities a2 ON ad.predecessor_id = a2.id
      ORDER BY ad.activity_id
    `).all());
  } catch (err) { next(err); }
});

app.post('/api/dependencies', async (req, res, next) => {
  try {
    const { activity_id, predecessor_id, dependency_type, lag_days } = req.body;
    const validation = await validateDependency(activity_id, predecessor_id);
    if (!validation.valid) return res.status(409).json({ error: true, message: validation.error });
    const db = await getDb();
    const result = db.prepare(
      'INSERT INTO activity_dependencies (activity_id, predecessor_id, dependency_type, lag_days) VALUES (?,?,?,?)'
    ).run(activity_id, predecessor_id, dependency_type || 'FS', lag_days || 0);
    res.status(201).json(db.prepare('SELECT * FROM activity_dependencies WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) { next(err); }
});

app.delete('/api/dependencies/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    db.prepare('DELETE FROM activity_dependencies WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// ──── Schedule / CPM ────
app.get('/api/schedule/cpm', async (req, res, next) => {
  try {
    const db = await getDb();
    const activities = db.prepare('SELECT * FROM activities ORDER BY id').all();
    const result = await runScheduler();
    // Convert Map to plain object for JSON and array with details
    const schedule = {};
    const results = [];
    for (const [id, r] of result.results) {
      schedule[id] = r;
      const act = activities.find(a => a.id === Number(id));
      results.push({
        id: Number(id),
        code: act ? act.code : `ACT-${id}`,
        name: act ? act.name : '',
        duration: act ? act.duration : 0,
        percent_complete: act ? act.percent_complete : 0,
        ...r,
      });
    }
    res.json({
      schedule,
      results,
      criticalPath: result.criticalPath,
      projectedEnd: result.projectedEnd,
    });
  } catch (err) { next(err); }
});

// ──── Delay Analysis ────
const { analyzeDelays } = require('./services/delayAnalysis');

app.get('/api/schedule/delays', async (req, res, next) => {
  try {
    res.json(await analyzeDelays());
  } catch (err) { next(err); }
});

// ──── Resource Workload ────
app.get('/api/resources/workload', async (req, res, next) => {
  try {
    const db = await getDb();
    const members = db.prepare('SELECT * FROM team_members ORDER BY id').all();
    const activities = db.prepare(`
      SELECT a.*, t.name as assignee_name FROM activities a
      LEFT JOIN team_members t ON a.assignee_id = t.id
      WHERE a.assignee_id IS NOT NULL
      ORDER BY a.planned_start
    `).all();

    const workload = members.map(m => {
      const tasks = activities.filter(a => a.assignee_id === m.id);
      // Detect over-allocation: overlapping date ranges
      const overlaps = [];
      for (let i = 0; i < tasks.length; i++) {
        for (let j = i + 1; j < tasks.length; j++) {
          const a = tasks[i], b = tasks[j];
          const aStart = a.actual_start || a.planned_start;
          const aEnd = a.actual_finish || a.planned_end;
          const bStart = b.actual_start || b.planned_start;
          const bEnd = b.actual_finish || b.planned_end;
          if (aStart <= bEnd && bStart <= aEnd) {
            overlaps.push({ activity1: a.code, activity2: b.code });
          }
        }
      }
      return {
        ...m,
        tasks: tasks.map(t => ({ id: t.id, code: t.code, name: t.name, planned_start: t.planned_start, planned_end: t.planned_end, percent_complete: t.percent_complete, status: t.status })),
        total_activities: tasks.length,
        active_activities: tasks.filter(t => t.status === 'In Progress').length,
        completed_activities: tasks.filter(t => t.status === 'Completed' || t.percent_complete >= 100).length,
        totalTasks: tasks.length,
        activeTasks: tasks.filter(t => t.status === 'In Progress').length,
        overAllocated: overlaps.length > 0,
        overlaps,
      };
    });
    res.json(workload);
  } catch (err) { next(err); }
});

// ──── Expenses ────
app.get('/api/expenses', async (req, res, next) => {
  try {
    const db = await getDb();
    let query = `SELECT e.*, a.code as activity_code, a.name as activity_name
      FROM expenses e JOIN activities a ON e.activity_id = a.id`;
    const params = [];
    if (req.query.activity_id) {
      query += ' WHERE e.activity_id = ?';
      params.push(req.query.activity_id);
    }
    query += ' ORDER BY e.date DESC';
    res.json(db.prepare(query).all(...params));
  } catch (err) { next(err); }
});

app.post('/api/expenses', async (req, res, next) => {
  try {
    const db = await getDb();
    const { activity_id, date, amount, description } = req.body;
    if (!activity_id || !date || !amount) return res.status(400).json({ error: true, message: 'activity_id, date, and amount are required' });
    if (Number(amount) <= 0) return res.status(400).json({ error: true, message: 'Amount must be positive' });
    const result = db.prepare('INSERT INTO expenses (activity_id, date, amount, description) VALUES (?,?,?,?)')
      .run(activity_id, date, amount, description || null);
    res.status(201).json(db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) { next(err); }
});

app.delete('/api/expenses/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// ──── EVM ────
const { computeEVM, generateAlerts, getThresholds, saveSnapshot, getSnapshots } = require('./services/evm');

app.get('/api/evm', async (req, res, next) => {
  try {
    const db = await getDb();
    const settingsRow = db.prepare("SELECT value FROM settings WHERE key = 'status_date'").get();
    const statusDate = req.query.date || (settingsRow ? settingsRow.value : '2026-12-01');
    const evm = await computeEVM(statusDate);
    const thresholds = await getThresholds();
    const alerts = generateAlerts(evm, thresholds);
    const charter = db.prepare('SELECT approved_budget FROM project_charter LIMIT 1').get();
    res.json({ ...evm, statusDate, alerts, thresholds, approvedBudget: charter?.approved_budget || 0 });
  } catch (err) { next(err); }
});

app.get('/api/evm/snapshots', async (req, res, next) => {
  try {
    res.json(await getSnapshots());
  } catch (err) { next(err); }
});

app.get('/api/evm/trend', async (req, res, next) => {
  try {
    const dates = ['2026-09-07', '2026-10-01', '2026-10-15', '2026-11-01', '2026-11-15', '2026-12-01', '2026-12-27'];
    const rows = [];
    for (const date of dates) rows.push({ date, ...(await computeEVM(date)) });
    res.json(rows);
  } catch (err) { next(err); }
});

app.post('/api/evm/snapshot', async (req, res, next) => {
  try {
    const db = await getDb();
    const settingsRow = db.prepare("SELECT value FROM settings WHERE key = 'status_date'").get();
    const statusDate = req.query.date || (settingsRow ? settingsRow.value : '2026-12-01');
    const evm = await computeEVM(statusDate);
    await saveSnapshot(evm, statusDate);
    res.json({ message: 'Snapshot saved', evm });
  } catch (err) { next(err); }
});

// ──── Milestones ────
app.get('/api/milestones', async (req, res, next) => {
  try {
    const db = await getDb();
    const settingsRow = db.prepare("SELECT value FROM settings WHERE key = 'status_date'").get();
    const statusDate = req.query.date || (settingsRow ? settingsRow.value : '2026-12-01');
    const { diffDays } = require('./services/scheduler');
    const milestones = db.prepare('SELECT * FROM milestones ORDER BY planned_date').all();
    for (const m of milestones) {
      m.activities = db.prepare(`
        SELECT a.id, a.code, a.name, a.status, a.percent_complete
        FROM milestone_activities ma JOIN activities a ON ma.activity_id = a.id
        WHERE ma.milestone_id = ?
      `).all(m.id);
      m.is_delayed = m.status !== 'Completed' && m.planned_date < statusDate;
      m.delay_days = m.is_delayed ? Math.max(0, diffDays(m.planned_date, statusDate)) : 0;
    }
    res.json(milestones);
  } catch (err) { next(err); }
});

app.post('/api/milestones', async (req, res, next) => {
  try {
    const db = await getDb();
    const { name, planned_date, actual_date, status, description, activity_ids } = req.body;
    if (!name || !planned_date) return res.status(400).json({ error: true, message: 'Name and planned_date are required' });
    const result = db.prepare('INSERT INTO milestones (name, planned_date, actual_date, status, description) VALUES (?,?,?,?,?)')
      .run(name, planned_date, actual_date || null, status || 'Not Started', description || null);
    const mid = result.lastInsertRowid;
    if (activity_ids) {
      for (const aid of activity_ids) {
        db.prepare('INSERT INTO milestone_activities (milestone_id, activity_id) VALUES (?,?)').run(mid, aid);
      }
    }
    res.status(201).json(db.prepare('SELECT * FROM milestones WHERE id = ?').get(mid));
  } catch (err) { next(err); }
});

app.put('/api/milestones/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const { name, planned_date, actual_date, status, description } = req.body;
    db.prepare(`UPDATE milestones SET name=COALESCE(?,name), planned_date=COALESCE(?,planned_date),
      actual_date=COALESCE(?,actual_date), status=COALESCE(?,status), description=COALESCE(?,description) WHERE id=?`)
      .run(name, planned_date, actual_date, status, description, req.params.id);
    res.json(db.prepare('SELECT * FROM milestones WHERE id = ?').get(req.params.id));
  } catch (err) { next(err); }
});

app.delete('/api/milestones/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    db.prepare('DELETE FROM milestone_activities WHERE milestone_id = ?').run(req.params.id);
    db.prepare('DELETE FROM milestones WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// ──── Responsibilities (RACI) ────
app.get('/api/responsibilities', async (req, res, next) => {
  try {
    const db = await getDb();
    res.json(db.prepare(`
      SELECT r.*, t.name as member_name, t.role as member_role
      FROM responsibilities r JOIN team_members t ON r.team_member_id = t.id
      ORDER BY r.deliverable, t.name
    `).all());
  } catch (err) { next(err); }
});

app.post('/api/responsibilities', async (req, res, next) => {
  try {
    const db = await getDb();
    const { team_member_id, deliverable, responsibility_type } = req.body;
    if (!team_member_id || !deliverable || !responsibility_type) return res.status(400).json({ error: true, message: 'All fields required' });
    const result = db.prepare('INSERT INTO responsibilities (team_member_id, deliverable, responsibility_type) VALUES (?,?,?)')
      .run(team_member_id, deliverable, responsibility_type);
    res.status(201).json(db.prepare('SELECT * FROM responsibilities WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) { err.status = 409; err.message = 'This RACI assignment already exists'; }
    next(err);
  }
});

app.delete('/api/responsibilities/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    db.prepare('DELETE FROM responsibilities WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// ──── Defects ────
app.get('/api/defects', async (req, res, next) => {
  try {
    const db = await getDb();
    let query = `SELECT d.*, t.name as assignee_name, a.code as activity_code, a.name as activity_name,
      w.code as wbs_code, w.title as wbs_title
      FROM defects d
      LEFT JOIN team_members t ON d.assignee_id = t.id
      LEFT JOIN activities a ON d.activity_id = a.id
      LEFT JOIN wbs_items w ON d.wbs_item_id = w.id`;
    const params = [];
    const conditions = [];
    if (req.query.severity) { conditions.push('d.severity = ?'); params.push(req.query.severity); }
    if (req.query.status) { conditions.push('d.status = ?'); params.push(req.query.status); }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY d.id';
    res.json(db.prepare(query).all(...params));
  } catch (err) { next(err); }
});

app.post('/api/defects', async (req, res, next) => {
  try {
    const db = await getDb();
    const b = req.body;
    if (!b.code || !b.title || !b.severity || !b.reported_date) {
      return res.status(400).json({ error: true, message: 'Code, title, severity, and reported_date are required' });
    }
    const result = db.prepare(`
      INSERT INTO defects (code, title, description, activity_id, wbs_item_id, severity, assignee_id, status, reported_date, resolved_date)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).run(b.code, b.title, b.description || null, b.activity_id || null, b.wbs_item_id || null,
      b.severity, b.assignee_id || null, b.status || 'Open', b.reported_date, b.resolved_date || null);
    db.prepare("INSERT INTO audit_log (entity_type, entity_id, action, details, user_name) VALUES ('defect', ?, 'CREATED', ?, 'System')")
      .run(result.lastInsertRowid, JSON.stringify({ code: b.code, severity: b.severity }));
    res.status(201).json(db.prepare('SELECT * FROM defects WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) { next(err); }
});

app.put('/api/defects/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const b = req.body;
    const old = db.prepare('SELECT * FROM defects WHERE id = ?').get(req.params.id);
    db.prepare(`UPDATE defects SET title=COALESCE(?,title), description=COALESCE(?,description),
      activity_id=COALESCE(?,activity_id), wbs_item_id=COALESCE(?,wbs_item_id),
      severity=COALESCE(?,severity), assignee_id=COALESCE(?,assignee_id), status=COALESCE(?,status),
      reported_date=COALESCE(?,reported_date), resolved_date=COALESCE(?,resolved_date),
      updated_at=datetime('now') WHERE id=?`)
      .run(b.title, b.description, b.activity_id, b.wbs_item_id, b.severity, b.assignee_id, b.status, b.reported_date, b.resolved_date, req.params.id);
    if (b.status && old && b.status !== old.status) {
      db.prepare("INSERT INTO audit_log (entity_type, entity_id, action, details, user_name) VALUES ('defect', ?, 'STATUS_CHANGED', ?, 'System')")
        .run(req.params.id, JSON.stringify({ from: old.status, to: b.status }));
    }
    res.json(db.prepare('SELECT * FROM defects WHERE id = ?').get(req.params.id));
  } catch (err) { next(err); }
});

app.delete('/api/defects/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    db.prepare('DELETE FROM defects WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// ──── Quality Checklists ────
app.get('/api/checklists', async (req, res, next) => {
  try {
    const db = await getDb();
    const checklists = db.prepare(`
      SELECT qc.*, w.code as wbs_code, w.title as wbs_title
      FROM quality_checklists qc LEFT JOIN wbs_items w ON qc.wbs_item_id = w.id
      ORDER BY qc.id
    `).all();
    for (const cl of checklists) {
      cl.items = db.prepare(`
        SELECT ci.*, ir.result, ir.tester_id, ir.test_date, ir.remarks as ir_remarks,
          t.name as tester_name
        FROM checklist_items ci
        LEFT JOIN inspection_results ir ON ci.id = ir.checklist_item_id
        LEFT JOIN team_members t ON ir.tester_id = t.id
        WHERE ci.checklist_id = ?
        ORDER BY ci.sort_order
      `).all(cl.id);
    }
    // Compute pass rates
    for (const cl of checklists) {
      const tested = cl.items.filter(i => i.result === 'Pass' || i.result === 'Fail');
      const passed = cl.items.filter(i => i.result === 'Pass');
      cl.pass_rate = tested.length > 0 ? Math.round((passed.length / tested.length) * 100 * 10) / 10 : null;
      cl.total_items = cl.items.length;
      cl.tested_count = tested.length;
      cl.passed_count = passed.length;
    }
    res.json(checklists);
  } catch (err) { next(err); }
});

app.post('/api/checklists', async (req, res, next) => {
  try {
    const db = await getDb();
    const { name, wbs_item_id, items } = req.body;
    if (!name) return res.status(400).json({ error: true, message: 'Name is required' });
    const result = db.prepare('INSERT INTO quality_checklists (name, wbs_item_id) VALUES (?,?)')
      .run(name, wbs_item_id || null);
    const clId = result.lastInsertRowid;
    if (items && items.length) {
      items.forEach((item, idx) => {
        db.prepare('INSERT INTO checklist_items (checklist_id, description, sort_order) VALUES (?,?,?)')
          .run(clId, item.description || item, idx + 1);
      });
    }
    res.status(201).json(db.prepare('SELECT * FROM quality_checklists WHERE id = ?').get(clId));
  } catch (err) { next(err); }
});

app.post('/api/checklists/:checklistId/items/:itemId/inspect', async (req, res, next) => {
  try {
    const db = await getDb();
    const { result, tester_id, test_date, remarks } = req.body;
    if (!result) return res.status(400).json({ error: true, message: 'Result is required (Pass/Fail/Not Tested)' });
    // Delete existing result and insert new one
    db.prepare('DELETE FROM inspection_results WHERE checklist_item_id = ?').run(req.params.itemId);
    const ins = db.prepare('INSERT INTO inspection_results (checklist_item_id, result, tester_id, test_date, remarks) VALUES (?,?,?,?,?)')
      .run(req.params.itemId, result, tester_id || null, test_date || new Date().toISOString().slice(0, 10), remarks || null);
    res.json(db.prepare('SELECT * FROM inspection_results WHERE id = ?').get(ins.lastInsertRowid));
  } catch (err) { next(err); }
});

// ──── Risks ────
app.get('/api/risks', async (req, res, next) => {
  try {
    const db = await getDb();
    res.json(db.prepare(`
      SELECT r.*, t.name as owner_name
      FROM risks r LEFT JOIN team_members t ON r.owner_id = t.id
      ORDER BY r.score DESC
    `).all());
  } catch (err) { next(err); }
});

app.post('/api/risks', async (req, res, next) => {
  try {
    const db = await getDb();
    const b = req.body;
    if (!b.code || !b.title || !b.likelihood || !b.impact) {
      return res.status(400).json({ error: true, message: 'Code, title, likelihood, and impact are required' });
    }
    const score = b.likelihood * b.impact;
    const result = db.prepare(`
      INSERT INTO risks (code, title, description, category, likelihood, impact, score, status, owner_id, mitigation_plan, contingency_plan)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `).run(b.code, b.title, b.description || null, b.category || null, b.likelihood, b.impact, score,
      b.status || 'Open', b.owner_id || null, b.mitigation_plan || null, b.contingency_plan || null);
    res.status(201).json(db.prepare('SELECT * FROM risks WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) { next(err); }
});

app.put('/api/risks/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const b = req.body;
    const existing = db.prepare('SELECT * FROM risks WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: true, message: 'Risk not found' });
    const likelihood = b.likelihood ?? existing.likelihood;
    const impact = b.impact ?? existing.impact;
    const score = likelihood * impact;
    db.prepare(`UPDATE risks SET title=COALESCE(?,title), description=COALESCE(?,description),
      category=COALESCE(?,category), likelihood=?, impact=?, score=?,
      status=COALESCE(?,status), owner_id=COALESCE(?,owner_id),
      mitigation_plan=COALESCE(?,mitigation_plan), contingency_plan=COALESCE(?,contingency_plan),
      updated_at=datetime('now') WHERE id=?`)
      .run(b.title, b.description, b.category, likelihood, impact, score, b.status, b.owner_id,
        b.mitigation_plan, b.contingency_plan, req.params.id);
    res.json(db.prepare('SELECT * FROM risks WHERE id = ?').get(req.params.id));
  } catch (err) { next(err); }
});

app.delete('/api/risks/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    db.prepare('DELETE FROM pdpc_items WHERE risk_id = ?').run(req.params.id);
    db.prepare('DELETE FROM risks WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// ──── PDPC Items ────
app.get('/api/pdpc', async (req, res, next) => {
  try {
    const db = await getDb();
    res.json(db.prepare('SELECT * FROM pdpc_items ORDER BY id').all());
  } catch (err) { next(err); }
});

app.post('/api/pdpc', async (req, res, next) => {
  try {
    const db = await getDb();
    const { parent_id, node_type, title, description, risk_id, color } = req.body;
    if (!node_type || !title) return res.status(400).json({ error: true, message: 'node_type and title are required' });
    const result = db.prepare('INSERT INTO pdpc_items (parent_id, node_type, title, description, risk_id, color) VALUES (?,?,?,?,?,?)')
      .run(parent_id || null, node_type, title, description || null, risk_id || null, color || null);
    res.status(201).json(db.prepare('SELECT * FROM pdpc_items WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) { next(err); }
});

app.put('/api/pdpc/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const { parent_id, node_type, title, description, risk_id, color } = req.body;
    db.prepare(`UPDATE pdpc_items SET parent_id=COALESCE(?,parent_id), node_type=COALESCE(?,node_type),
      title=COALESCE(?,title), description=COALESCE(?,description), risk_id=COALESCE(?,risk_id),
      color=COALESCE(?,color) WHERE id=?`)
      .run(parent_id, node_type, title, description, risk_id, color, req.params.id);
    res.json(db.prepare('SELECT * FROM pdpc_items WHERE id = ?').get(req.params.id));
  } catch (err) { next(err); }
});

app.delete('/api/pdpc/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    db.prepare('DELETE FROM pdpc_items WHERE parent_id = ?').run(req.params.id);
    db.prepare('DELETE FROM pdpc_items WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// ──── Project Closure ────
app.get('/api/closure', async (req, res, next) => {
  try {
    const db = await getDb();
    const closure = db.prepare('SELECT * FROM project_closure LIMIT 1').get();
    // Check closure conditions
    const openCritHigh = db.prepare("SELECT COUNT(*) as cnt FROM defects WHERE severity IN ('Critical','High') AND status NOT IN ('Closed','Verified')").get();
    const incompleteReqs = db.prepare("SELECT COUNT(*) as cnt FROM requirements WHERE status = 'Approved'").get();
    const conditions = [];
    if (openCritHigh.cnt > 0) conditions.push({ passed: false, message: `${openCritHigh.cnt} open Critical/High defect(s)` });
    else conditions.push({ passed: true, message: 'All Critical/High defects resolved' });
    if (incompleteReqs.cnt > 0) conditions.push({ passed: false, message: `${incompleteReqs.cnt} approved requirement(s) not yet implemented` });
    else conditions.push({ passed: true, message: 'All approved requirements implemented' });
    const canClose = conditions.every(c => c.passed);
    res.json({ ...closure, conditions, canClose });
  } catch (err) { next(err); }
});

app.put('/api/closure', async (req, res, next) => {
  try {
    const db = await getDb();
    const b = req.body;
    // If trying to sign off, check conditions
    if (b.status === 'Signed Off') {
      const openCritHigh = db.prepare("SELECT COUNT(*) as cnt FROM defects WHERE severity IN ('Critical','High') AND status NOT IN ('Closed','Verified')").get();
      const incompleteReqs = db.prepare("SELECT COUNT(*) as cnt FROM requirements WHERE status = 'Approved'").get();
      const failures = [];
      if (openCritHigh.cnt > 0) failures.push(`${openCritHigh.cnt} open Critical/High defect(s)`);
      if (incompleteReqs.cnt > 0) failures.push(`${incompleteReqs.cnt} approved requirement(s) not yet implemented`);
      if (failures.length) {
        return res.status(409).json({ error: true, message: `Cannot sign off: ${failures.join('; ')}` });
      }
    }
    db.prepare(`UPDATE project_closure SET final_cost=COALESCE(?,final_cost),
      actual_end_date=COALESCE(?,actual_end_date), lessons_learned=COALESCE(?,lessons_learned),
      sign_off_by=COALESCE(?,sign_off_by), sign_off_date=COALESCE(?,sign_off_date),
      status=COALESCE(?,status), updated_at=datetime('now') WHERE id=1`)
      .run(b.final_cost, b.actual_end_date, b.lessons_learned, b.sign_off_by, b.sign_off_date, b.status);
    if (b.status) {
      db.prepare("INSERT INTO audit_log (entity_type, entity_id, action, details, user_name) VALUES ('project_closure', 1, ?, ?, 'System')")
        .run(b.status === 'Signed Off' ? 'SIGNED_OFF' : 'UPDATED', JSON.stringify({ status: b.status }));
    }
    res.json(db.prepare('SELECT * FROM project_closure WHERE id = 1').get());
  } catch (err) { next(err); }
});

// ──── Audit Log ────
app.get('/api/audit-log', async (req, res, next) => {
  try {
    const db = await getDb();
    let query = 'SELECT * FROM audit_log';
    const params = [];
    if (req.query.entity_type) {
      query += ' WHERE entity_type = ?';
      params.push(req.query.entity_type);
    }
    query += ' ORDER BY created_at DESC LIMIT 200';
    res.json(db.prepare(query).all(...params));
  } catch (err) { next(err); }
});

// ──── Dashboard aggregate ────
app.get('/api/dashboard', async (req, res, next) => {
  try {
    const db = await getDb();
    const charter = db.prepare('SELECT * FROM project_charter LIMIT 1').get();
    const settingsRow = db.prepare("SELECT value FROM settings WHERE key = 'status_date'").get();
    const statusDate = req.query.date || (settingsRow ? settingsRow.value : '2026-12-01');

    // EVM
    const evm = await computeEVM(statusDate);
    const thresholds = await getThresholds();
    const alerts = generateAlerts(evm, thresholds);

    // Counts
    const { diffDays: dd } = require('./services/scheduler');
    const totalActivities = db.prepare('SELECT COUNT(*) as cnt FROM activities').get().cnt;
    const completedActs = db.prepare("SELECT COUNT(*) as cnt FROM activities WHERE status='Completed'").get().cnt;
    const delayedActs = db.prepare(`SELECT COUNT(*) as cnt FROM activities WHERE status != 'Completed' AND percent_complete < 100 AND planned_end < ?`).get(statusDate).cnt;
    const delayedMilestones = db.prepare(`SELECT COUNT(*) as cnt FROM milestones WHERE status != 'Completed' AND planned_date < ?`).get(statusDate).cnt;
    const pendingCRs = db.prepare("SELECT COUNT(*) as cnt FROM change_requests WHERE status IN ('Submitted','Under Review')").get().cnt;
    const criticalDefects = db.prepare("SELECT COUNT(*) as cnt FROM defects WHERE severity='Critical' AND status NOT IN ('Closed','Verified')").get().cnt;
    const highDefects = db.prepare("SELECT COUNT(*) as cnt FROM defects WHERE severity='High' AND status NOT IN ('Closed','Verified')").get().cnt;
    const topRisks = db.prepare("SELECT code, title, score, likelihood, impact FROM risks WHERE status='Open' ORDER BY score DESC LIMIT 5").all();
    const upcomingMilestones = db.prepare("SELECT * FROM milestones WHERE status != 'Completed' ORDER BY planned_date LIMIT 5").all();
    for (const m of upcomingMilestones) {
      m.is_delayed = m.planned_date < statusDate;
      m.delay_days = m.is_delayed ? Math.max(0, dd(m.planned_date, statusDate)) : 0;
    }

    // Overall progress
    const overallProgress = totalActivities > 0 ? Math.round((completedActs / totalActivities) * 100) : 0;

    // Days remaining
    const daysRemaining = charter ? dd(statusDate, charter.end_date) : 0;

    // Health
    let health = 'On Track';
    if (evm.CPI !== null && evm.CPI < 0.80) health = 'Critical';
    else if (evm.CPI !== null && evm.CPI < 0.90) health = 'At Risk';
    if (evm.SPI !== null && evm.SPI < 0.80) health = 'Critical';
    else if (evm.SPI !== null && evm.SPI < 0.90 && health !== 'Critical') health = 'At Risk';

    if (charter) {
      charter.objectives = JSON.parse(charter.objectives || '[]');
      charter.scope_in = JSON.parse(charter.scope_in || '[]');
      charter.scope_out = JSON.parse(charter.scope_out || '[]');
    }

    res.json({
      charter,
      statusDate,
      evm,
      alerts,
      overallProgress,
      health,
      daysRemaining,
      budget: {
        approved: charter?.approved_budget || 0,
        bac: evm.BAC,
        ac: evm.AC,
        eac: evm.EAC,
      },
      counts: {
        totalActivities,
        completedActivities: completedActs,
        delayedActivities: delayedActs,
        delayedMilestones,
        delayedItems: delayedActs + delayedMilestones,
        pendingChangeRequests: pendingCRs,
        criticalDefects,
        highDefects,
      },
      topRisks,
      upcomingMilestones,
    });
  } catch (err) { next(err); }
});

// ──── Serve React build in production ────
const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuildPath));
app.get('*', (req, res, next) => {
  // Only serve index.html for non-API routes
  if (req.path.startsWith('/api')) return next();
  const indexPath = path.join(clientBuildPath, 'index.html');
  const fs = require('fs');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send('Client not built yet. Run: cd client && npm run build');
  }
});

// ──── Global Error Handler (must be last) ────
app.use(errorHandler);

// ──── Start Server ────
async function start() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`\n🚀 Healthcare PM Server running on http://localhost:${PORT}`);
      console.log(`   API: http://localhost:${PORT}/api/health\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Only start if run directly (not when imported for testing)
if (require.main === module) {
  start();
}

module.exports = { app, start };
