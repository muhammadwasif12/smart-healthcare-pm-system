/**
 * Change Request Approval Service — server/services/changeRequest.js
 *
 * Handles CR approval in a SINGLE database transaction:
 *   1. Set CR status → 'Approved', record decision_date + approver
 *   2. Move linked requirements from 'Proposed' → 'Approved'
 *   3. Update charter: approved_budget += cost_impact, end_date += schedule_impact_weeks
 *   4. Generate WBS work packages for new scope
 *   5. Optionally generate placeholder activities for new requirements
 *   6. Write audit_log entry
 *
 * Rejected CRs change nothing except CR status.
 * Approving an already-approved CR is blocked (HTTP 409).
 */

const { getDb } = require('../db/connection');
const { addDays, computeCPM } = require('./scheduler');

/**
 * Approve a change request (single transaction).
 *
 * @param {number} crId       — change_request.id
 * @param {string} approver   — name of the person approving
 * @param {string} remarks    — optional decision remarks
 * @returns {Object} { before, after, cr, newRequirements, newWbsItems }
 */
async function approveChangeRequest(crId, approver, remarks, customDb = null) {
  const db = customDb || await getDb();

  // Fetch the CR
  const cr = db.prepare('SELECT * FROM change_requests WHERE id = ?').get(crId);
  if (!cr) throw Object.assign(new Error('Change request not found'), { status: 404 });
  if (cr.status === 'Approved') {
    throw Object.assign(new Error('Change request is already approved'), { status: 409 });
  }
  if (cr.status === 'Rejected') {
    throw Object.assign(new Error('Cannot approve a rejected change request'), { status: 409 });
  }

  // Fetch current charter (before state)
  const charter = db.prepare('SELECT * FROM project_charter LIMIT 1').get();
  if (!charter) throw Object.assign(new Error('No project charter found'), { status: 404 });

  // Fetch linked requirements
  const linkedReqs = db.prepare(`
    SELECT r.* FROM requirements r
    JOIN change_request_requirements crr ON crr.requirement_id = r.id
    WHERE crr.change_request_id = ?
  `).all(crId);

  // Snapshot "before" state
  const before = {
    approved_budget: charter.approved_budget,
    end_date: charter.end_date,
    approved_requirements_count: db.prepare(
      "SELECT COUNT(*) as cnt FROM requirements WHERE status IN ('Approved','Implemented')"
    ).get().cnt,
    scope_items: db.prepare(
      "SELECT COUNT(*) as cnt FROM wbs_items WHERE is_work_package = 1"
    ).get().cnt,
  };

  // ──── Execute approval in a transaction ────
  const doApproval = db.transaction(() => {
    const now = new Date().toISOString().slice(0, 10);

    // 1. Update CR status
    db.prepare(`
      UPDATE change_requests
      SET status = 'Approved', decision_date = ?, approver = ?, remarks = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(now, approver || 'Project Manager', remarks || '', crId);

    // 2. Move linked requirements to 'Approved'
    const newRequirements = [];
    for (const req of linkedReqs) {
      if (req.status === 'Proposed') {
        db.prepare(`
          UPDATE requirements SET status = 'Approved', updated_at = datetime('now') WHERE id = ?
        `).run(req.id);
        newRequirements.push({ ...req, status: 'Approved' });
      }
    }

    // 3. Update charter: budget += cost_impact, deadline += schedule_impact_weeks
    const newBudget = charter.approved_budget + (cr.cost_impact || 0);
    const weeksToAdd = cr.schedule_impact_weeks || 0;
    const newEndDate = addDays(charter.end_date, Math.round(weeksToAdd * 7));

    db.prepare(`
      UPDATE project_charter
      SET approved_budget = ?, end_date = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newBudget, newEndDate, charter.id);

    // 4. Generate WBS items & Activities for new scope
    const newWbsItems = [];
    const newActivities = [];

    // Find the parent WBS node for new scope (use '1.3' Core Modules or fallback)
    const coreModulesWbs = db.prepare("SELECT id FROM wbs_items WHERE code = '1.3'").get();
    const parentId = coreModulesWbs ? coreModulesWbs.id : 1; // fallback to root

    // Count existing children to generate WBS codes
    const existingChildren = db.prepare(
      "SELECT COUNT(*) as cnt FROM wbs_items WHERE parent_id = ?"
    ).get(parentId);
    let childIndex = (existingChildren ? existingChildren.cnt : 0) + 1;

    // Scope items to add: either the new requirements or a fallback item for the CR
    const scopeItems = newRequirements.length > 0 
      ? newRequirements 
      : [{ id: null, title: cr.title, code: cr.code }];

    // Cost per scope item
    const costPerItem = Math.round((cr.cost_impact || 0) / scopeItems.length);
    const durationDays = Math.max(1, Math.round(weeksToAdd * 7));
    const actStart = addDays(charter.end_date, 1);
    const actEnd = newEndDate;

    for (const item of scopeItems) {
      const parentCode = coreModulesWbs ? '1.3' : '1.0';
      const wbsCode = `${parentCode}.${childIndex}`;
      childIndex++;

      // Create WBS work package
      db.prepare(`
        INSERT INTO wbs_items (code, title, description, parent_id, level, requirement_id, is_work_package, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      `).run(
        wbsCode,
        item.title,
        `Work package for ${item.title} (added via ${cr.code})`,
        parentId,
        2,
        item.id,
        childIndex
      );
      const wbsId = db.prepare("SELECT last_insert_rowid() as id").get().id;
      newWbsItems.push({ id: wbsId, code: wbsCode, title: item.title, requirement_id: item.id });

      // Determine next activity number
      const allActs = db.prepare("SELECT id, code FROM activities ORDER BY id ASC").all();
      let maxActNum = 0;
      for (const a of allActs) {
        const m = a.code && a.code.match(/ACT-(\d+)/);
        if (m) {
          const num = parseInt(m[1], 10);
          if (num > maxActNum) maxActNum = num;
        }
      }
      const nextActNum = maxActNum + 1;
      const actCode = `ACT-${String(nextActNum).padStart(3, '0')}`;
      const integrationTesting = db.prepare("SELECT id FROM activities WHERE code = 'ACT-016'").get();

      // Auto-generate activity with cost_impact so BAC stays equal to approved_budget
      db.prepare(`
        INSERT INTO activities (code, name, wbs_item_id, assignee_id, duration, planned_start, planned_end, percent_complete, status, estimated_cost)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'Not Started', ?)
      `).run(
        actCode,
        item.title,
        wbsId,
        2, // default assignee: Technical Lead
        durationDays,
        actStart,
        actEnd,
        costPerItem
      );
      const newActId = db.prepare("SELECT last_insert_rowid() as id").get().id;
      newActivities.push({
        id: newActId,
        code: actCode,
        name: item.title,
        wbs_item_id: wbsId,
        duration: durationDays,
        planned_start: actStart,
        planned_end: actEnd,
        estimated_cost: costPerItem,
        percent_complete: 0,
        status: 'Not Started'
      });

      // New scope work starts after integration testing, not after go-live.
      if (integrationTesting) {
        db.prepare(`
          INSERT OR IGNORE INTO activity_dependencies (activity_id, predecessor_id, dependency_type, lag_days)
          VALUES (?, ?, 'FS', 0)
        `).run(newActId, integrationTesting.id);
      }

      const statusDate = db.prepare("SELECT value FROM settings WHERE key = 'status_date'").get();
      db.prepare(`
        INSERT INTO progress_log (activity_id, date, percent_complete)
        VALUES (?, ?, 0)
        ON CONFLICT(activity_id, date) DO UPDATE SET percent_complete = 0
      `).run(newActId, statusDate ? statusDate.value : '2026-12-01');

      // Update Go-Live milestone planned_date and link
      db.prepare(`
        UPDATE milestones SET planned_date = ? WHERE id = 5 OR name LIKE '%Go-Live%' OR name LIKE '%Handover%'
      `).run(newEndDate);

      const goLiveMilestone = db.prepare(`
        SELECT id FROM milestones WHERE id = 5 OR name LIKE '%Go-Live%' OR name LIKE '%Handover%' LIMIT 1
      `).get();
      if (goLiveMilestone) {
        db.prepare(`
          INSERT OR IGNORE INTO milestone_activities (milestone_id, activity_id) VALUES (?, ?)
        `).run(goLiveMilestone.id, newActId);
      }

      const generatedActivityIds = newActivities.map(activity => activity.id);
      if (generatedActivityIds.length > 0) {
        const placeholders = generatedActivityIds.map(() => '?').join(',');
        const finalActivities = db.prepare(`
          SELECT id FROM activities WHERE code IN ('ACT-018', 'ACT-025')
        `).all();
        for (const finalActivity of finalActivities) {
          for (const generatedActivityId of generatedActivityIds) {
            db.prepare(`
              INSERT OR IGNORE INTO activity_dependencies (activity_id, predecessor_id, dependency_type, lag_days)
              VALUES (?, ?, 'FS', 0)
            `).run(finalActivity.id, generatedActivityId);
          }
        }
      }
    }

    // Re-run CPM after adding CR work and persist dates for the affected chain.
    const scheduledActivities = db.prepare('SELECT * FROM activities ORDER BY id').all();
    const scheduledDependencies = db.prepare('SELECT * FROM activity_dependencies').all();
    const schedule = computeCPM(scheduledActivities, scheduledDependencies, charter.start_date);
    const affectedCodes = ['ACT-026', 'ACT-027', 'ACT-018', 'ACT-019', 'ACT-020', 'ACT-021', 'ACT-022', 'ACT-023', 'ACT-024'];
    for (const code of affectedCodes) {
      const activity = scheduledActivities.find(item => item.code === code);
      const result = activity && schedule.results.get(activity.id);
      if (result) {
        db.prepare(`
          UPDATE activities
          SET planned_start = ?, planned_end = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(result.ES, result.EF, activity.id);
      }
    }
    db.prepare(`
      UPDATE activities
      SET planned_start = ?, planned_end = ?, updated_at = datetime('now')
      WHERE code = 'ACT-025'
    `).run(newEndDate, newEndDate);
    db.prepare(`
      UPDATE milestones
      SET planned_date = ?
      WHERE id = 5 OR name LIKE '%Go-Live%' OR name LIKE '%Handover%'
    `).run(newEndDate);

    // 5. Audit log entry
    db.prepare(`
      INSERT INTO audit_log (entity_type, entity_id, action, details, user_name)
      VALUES ('change_request', ?, 'APPROVED', ?, ?)
    `).run(crId, JSON.stringify({
      code: cr.code,
      title: cr.title,
      cost_impact: cr.cost_impact,
      schedule_impact_weeks: cr.schedule_impact_weeks,
      budget_before: charter.approved_budget,
      budget_after: newBudget,
      deadline_before: charter.end_date,
      deadline_after: newEndDate,
      requirements_added: newRequirements.map(r => r.code),
      wbs_items_added: newWbsItems.map(w => w.code),
      activities_added: newActivities.map(a => a.code),
    }), approver || 'Project Manager');

    return { newBudget, newEndDate, newRequirements, newWbsItems, newActivities };
  });

  const result = doApproval();

  // Snapshot "after" state
  const after = {
    approved_budget: result.newBudget,
    end_date: result.newEndDate,
    approved_requirements_count: before.approved_requirements_count + result.newRequirements.length,
    scope_items: before.scope_items + result.newWbsItems.length,
  };

  return {
    before,
    after,
    cr: { ...cr, status: 'Approved' },
    newRequirements: result.newRequirements,
    newWbsItems: result.newWbsItems,
    newActivities: result.newActivities,
  };
}

/**
 * Reject a change request.
 */
async function rejectChangeRequest(crId, approver, remarks, customDb = null) {
  const db = customDb || await getDb();

  const cr = db.prepare('SELECT * FROM change_requests WHERE id = ?').get(crId);
  if (!cr) throw Object.assign(new Error('Change request not found'), { status: 404 });
  if (cr.status === 'Approved') {
    throw Object.assign(new Error('Cannot reject an already approved change request'), { status: 409 });
  }
  if (cr.status === 'Rejected') {
    throw Object.assign(new Error('Change request is already rejected'), { status: 409 });
  }

  const now = new Date().toISOString().slice(0, 10);
  db.prepare(`
    UPDATE change_requests
    SET status = 'Rejected', decision_date = ?, approver = ?, remarks = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(now, approver || 'Project Manager', remarks || '', crId);

  // Audit log
  db.prepare(`
    INSERT INTO audit_log (entity_type, entity_id, action, details, user_name)
    VALUES ('change_request', ?, 'REJECTED', ?, ?)
  `).run(crId, JSON.stringify({ code: cr.code, title: cr.title, remarks }), approver || 'Project Manager');

  return { ...cr, status: 'Rejected' };
}

/**
 * Check if a requirement is in approved scope.
 * Approved scope = requirements with status 'Approved' or 'Implemented'.
 */
async function isRequirementInScope(requirementId) {
  const db = await getDb();
  const req = db.prepare('SELECT status FROM requirements WHERE id = ?').get(requirementId);
  if (!req) return false;
  return req.status === 'Approved' || req.status === 'Implemented';
}

/**
 * Validate that a WBS item or activity only links to approved requirements.
 * Returns an error message if the requirement is not in approved scope.
 */
async function validateScopeLink(requirementId) {
  if (!requirementId) return null; // no requirement link is OK
  const inScope = await isRequirementInScope(requirementId);
  if (!inScope) {
    const db = await getDb();
    const req = db.prepare('SELECT code, title, status FROM requirements WHERE id = ?').get(requirementId);
    if (!req) return 'Requirement not found';
    return `Cannot link to requirement ${req.code} ("${req.title}") — status is "${req.status}". Only Approved or Implemented requirements can be linked to WBS items and activities.`;
  }
  return null;
}

module.exports = {
  approveChangeRequest,
  rejectChangeRequest,
  isRequirementInScope,
  validateScopeLink,
};
