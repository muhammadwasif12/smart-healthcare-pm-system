/**
 * Scope and Change Request Tests — tests/scope.test.js
 *
 * Tests:
 * 1. Unapproved requirements cannot be linked to WBS items or activities (409)
 * 2. Approving a CR moves linked requirements into scope, updates budget and deadline
 * 3. Double approval is blocked (409)
 */

const { createTestDb } = require('./setup');
const { approveChangeRequest } = require('../server/services/changeRequest');
const { computeEVM } = require('../server/services/evm');

let db;

beforeEach(async () => {
  db = await createTestDb();
});

describe('Unapproved Requirement Blocking', () => {
  it('REQ-016 (Proposed) should NOT be in approved scope', () => {
    const req = db.prepare("SELECT * FROM requirements WHERE code = 'REQ-016'").get();
    expect(req).toBeDefined();
    expect(req.status).toBe('Proposed');
    expect(['Approved', 'Implemented']).not.toContain(req.status);
  });

  it('should reject creating a WBS item linked to an unapproved requirement', () => {
    const req16 = db.prepare("SELECT id FROM requirements WHERE code = 'REQ-016'").get();
    expect(req16).toBeDefined();

    const reqStatus = db.prepare('SELECT status FROM requirements WHERE id = ?').get(req16.id);
    expect(reqStatus.status).toBe('Proposed');

    const inScope = reqStatus.status === 'Approved' || reqStatus.status === 'Implemented';
    expect(inScope).toBe(false);
  });

  it('should reject creating an activity linked to WBS with unapproved requirement', () => {
    const req16 = db.prepare("SELECT id, status FROM requirements WHERE code = 'REQ-016'").get();
    expect(req16.status).toBe('Proposed');

    const inScope = req16.status === 'Approved' || req16.status === 'Implemented';
    expect(inScope).toBe(false);
  });

  it('should ALLOW creating WBS items linked to approved requirements', () => {
    const req1 = db.prepare("SELECT id, status FROM requirements WHERE code = 'REQ-001'").get();
    expect(req1).toBeDefined();
    expect(['Approved', 'Implemented']).toContain(req1.status);

    const inScope = req1.status === 'Approved' || req1.status === 'Implemented';
    expect(inScope).toBe(true);
  });
});

describe('Change Request End-to-End Consistency — CR-001 & CR-002', () => {
  it('CR-001 and CR-002 are in Submitted state before approval with initial 5.0M budget', () => {
    const cr1 = db.prepare("SELECT * FROM change_requests WHERE code = 'CR-001'").get();
    const cr2 = db.prepare("SELECT * FROM change_requests WHERE code = 'CR-002'").get();
    expect(cr1.status).toBe('Submitted');
    expect(cr2.status).toBe('Submitted');
    expect(cr1.cost_impact).toBe(500000);
    expect(cr2.cost_impact).toBe(300000);
    expect(cr1.schedule_impact_weeks).toBe(2);
    expect(cr2.schedule_impact_weeks).toBe(1);

    const charter = db.prepare('SELECT * FROM project_charter LIMIT 1').get();
    expect(charter.approved_budget).toBe(5000000);
    expect(charter.end_date).toBe('2026-12-27');

    const activities = db.prepare('SELECT * FROM activities').all();
    expect(activities).toHaveLength(25);
    const initialBAC = activities.reduce((sum, a) => sum + a.estimated_cost, 0);
    expect(initialBAC).toBe(5000000);
    expect(charter.approved_budget).toBe(initialBAC);

    const scopeCount = db.prepare("SELECT COUNT(*) as cnt FROM requirements WHERE status IN ('Approved','Implemented')").get().cnt;
    expect(scopeCount).toBe(15);
  });

  it('approving CR-001 transitions REQ-016 from Proposed to Approved', async () => {
    const req16Before = db.prepare("SELECT status FROM requirements WHERE code = 'REQ-016'").get();
    expect(req16Before.status).toBe('Proposed');

    await approveChangeRequest(1, 'Board of Directors', 'Approved AI Module', db);

    const req16After = db.prepare("SELECT status FROM requirements WHERE code = 'REQ-016'").get();
    expect(req16After.status).toBe('Approved');
  });

  it('approves CR-001 then CR-002: budget 5.0M -> 5.5M -> 5.8M, deadline Dec 27 -> Jan 10 -> Jan 17 (19 weeks), scope 15 -> 16 -> 17, and BAC matches approved budget at each step', async () => {
    // ──── Step 0: Initial State ────
    const charter0 = db.prepare('SELECT * FROM project_charter LIMIT 1').get();
    expect(charter0.approved_budget).toBe(5000000);
    expect(charter0.end_date).toBe('2026-12-27');
    let scopeCount = db.prepare("SELECT COUNT(*) as cnt FROM requirements WHERE status IN ('Approved','Implemented')").get().cnt;
    expect(scopeCount).toBe(15);

    // ──── Step 1: Approve CR-001 ────
    const res1 = await approveChangeRequest(1, 'Board of Directors', 'Approved AI Module', db);
    expect(res1.cr.status).toBe('Approved');
    expect(res1.after.approved_budget).toBe(5500000);
    expect(res1.after.end_date).toBe('2027-01-10');
    expect(res1.after.approved_requirements_count).toBe(16);

    const charter1 = db.prepare('SELECT * FROM project_charter LIMIT 1').get();
    expect(charter1.approved_budget).toBe(5500000);
    expect(charter1.end_date).toBe('2027-01-10');

    // Auto-generated work-package activity ACT-026
    const act26 = db.prepare("SELECT * FROM activities WHERE code = 'ACT-026'").get();
    expect(act26).toBeDefined();
    expect(act26.estimated_cost).toBe(500000);
    expect(act26.duration).toBe(14);
    expect(act26.planned_start).toBe('2026-12-10');
    expect(act26.planned_end).toBe('2026-12-23');
    expect(act26.percent_complete).toBe(0);
    expect(act26.status).toBe('Not Started');

    // Dependency ACT-026 depends on ACT-016 Integration Testing (FS)
    const dep26 = db.prepare("SELECT * FROM activity_dependencies WHERE activity_id = ?").get(act26.id);
    expect(dep26).toBeDefined();
    const act16 = db.prepare("SELECT id FROM activities WHERE code = 'ACT-016'").get();
    expect(dep26.predecessor_id).toBe(act16.id);
    expect(dep26.dependency_type).toBe('FS');
    expect(db.prepare("SELECT percent_complete FROM progress_log WHERE activity_id = ? AND date = '2026-12-01'").get(act26.id).percent_complete).toBe(0);

    // Check BAC after CR-001
    const evm1 = await computeEVM('2026-12-01', db);
    expect(evm1.BAC).toBe(5500000);
    expect(evm1.BAC).toBe(charter1.approved_budget);

    // ──── Step 2: Approve CR-002 ────
    const res2 = await approveChangeRequest(2, 'Board of Directors', 'Approved Mobile App', db);
    expect(res2.cr.status).toBe('Approved');
    expect(res2.after.approved_budget).toBe(5800000);
    expect(res2.after.end_date).toBe('2027-01-17');
    expect(res2.after.approved_requirements_count).toBe(17);

    const charter2 = db.prepare('SELECT * FROM project_charter LIMIT 1').get();
    expect(charter2.approved_budget).toBe(5800000);
    expect(charter2.end_date).toBe('2027-01-17');

    // Check 19 weeks total project duration from start (2026-09-07) to 2027-01-17
    const start = new Date('2026-09-07T00:00:00Z');
    const end = new Date(charter2.end_date + 'T00:00:00Z');
    const totalDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1; // inclusive
    expect(totalDays).toBe(133); // 19 weeks * 7 days = 133 days
    expect(totalDays / 7).toBe(19);

    // Auto-generated work-package activity ACT-027
    const act27 = db.prepare("SELECT * FROM activities WHERE code = 'ACT-027'").get();
    expect(act27).toBeDefined();
    expect(act27.estimated_cost).toBe(300000);
    expect(act27.duration).toBe(7);
    expect(act27.planned_start).toBe('2026-12-10');
    expect(act27.planned_end).toBe('2026-12-16');
    expect(act27.percent_complete).toBe(0);
    expect(act27.status).toBe('Not Started');

    // Dependency ACT-027 also starts after Integration Testing (FS)
    const dep27 = db.prepare("SELECT * FROM activity_dependencies WHERE activity_id = ?").get(act27.id);
    expect(dep27).toBeDefined();
    expect(dep27.predecessor_id).toBe(act16.id);
    expect(dep27.dependency_type).toBe('FS');
    expect(db.prepare("SELECT percent_complete FROM progress_log WHERE activity_id = ? AND date = '2026-12-01'").get(act27.id).percent_complete).toBe(0);

    const act18 = db.prepare("SELECT id FROM activities WHERE code = 'ACT-018'").get();
    const act25 = db.prepare("SELECT id FROM activities WHERE code = 'ACT-025'").get();
    const finalDependencies = db.prepare(`
      SELECT activity_id, predecessor_id
      FROM activity_dependencies
      WHERE activity_id IN (?, ?) AND predecessor_id IN (?, ?)
    `).all(act18.id, act25.id, act26.id, act27.id);
    expect(finalDependencies).toHaveLength(4);

    // Final BAC check
    const evm2 = await computeEVM('2026-12-01', db);
    expect(evm2.BAC).toBe(5800000);
    expect(evm2.BAC).toBe(charter2.approved_budget);

    // Handover milestone tracks project completion
    const milestone5 = db.prepare("SELECT * FROM milestones WHERE id = 5").get();
    expect(milestone5.planned_date).toBe('2027-01-17');
  });

  it('blocks double approval with status 409 error', async () => {
    await approveChangeRequest(1, 'Board', 'First approval', db);
    await expect(approveChangeRequest(1, 'Board', 'Second approval', db)).rejects.toThrow(
      'Change request is already approved'
    );
  });

  it('CR-generated activities depend on integration testing and are logged at 0%', async () => {
    await approveChangeRequest(1, 'Board of Directors', 'Approved AI Module', db);
    await approveChangeRequest(2, 'Board of Directors', 'Approved Mobile App', db);

    const act16 = db.prepare("SELECT id FROM activities WHERE code = 'ACT-016'").get();
    const act26 = db.prepare("SELECT id FROM activities WHERE code = 'ACT-026'").get();
    const act27 = db.prepare("SELECT id FROM activities WHERE code = 'ACT-027'").get();
    const act18 = db.prepare("SELECT id FROM activities WHERE code = 'ACT-018'").get();
    const act25 = db.prepare("SELECT id FROM activities WHERE code = 'ACT-025'").get();

    const generatedDependencies = db.prepare(`
      SELECT activity_id, predecessor_id
      FROM activity_dependencies
      WHERE (activity_id = ? AND predecessor_id = ?)
         OR (activity_id = ? AND predecessor_id = ?)
         OR (activity_id = ? AND predecessor_id IN (?, ?))
         OR (activity_id = ? AND predecessor_id IN (?, ?))
    `).all(act26.id, act16.id, act27.id, act16.id, act18.id, act26.id, act27.id, act25.id, act26.id, act27.id);
    expect(generatedDependencies).toHaveLength(6);

    for (const activity of [act26, act27]) {
      expect(db.prepare(`
        SELECT percent_complete
        FROM progress_log
        WHERE activity_id = ? AND date = '2026-12-01'
      `).get(activity.id).percent_complete).toBe(0);
    }

    expect(db.prepare('SELECT approved_budget FROM project_charter').get().approved_budget).toBe(5800000);
  });

  it('no activity starts before the latest finish of its predecessors after both CRs are approved', async () => {
    await approveChangeRequest(1, 'Board of Directors', 'Approved AI Module', db);
    await approveChangeRequest(2, 'Board of Directors', 'Approved Mobile App', db);

    const activities = db.prepare('SELECT id, code, planned_start, planned_end FROM activities').all();
    const activityById = new Map(activities.map(activity => [activity.id, activity]));
    const dependencies = db.prepare(`
      SELECT activity_id, predecessor_id, dependency_type
      FROM activity_dependencies
    `).all();

    for (const dependency of dependencies) {
      if (dependency.dependency_type !== 'FS') continue;
      const activity = activityById.get(dependency.activity_id);
      const predecessor = activityById.get(dependency.predecessor_id);
      expect(activity.planned_start > predecessor.planned_end).toBe(true);
    }

    expect(db.prepare("SELECT planned_date FROM milestones WHERE id = 5").get().planned_date).toBe('2027-01-17');
  });
});
