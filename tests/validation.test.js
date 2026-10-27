/**
 * Data Validation Tests — tests/validation.test.js
 *
 * Tests database constraints, referential integrity,
 * and the schema's CHECK constraints.
 */

const { createTestDb } = require('./setup');

let db;

beforeEach(async () => {
  db = await createTestDb();
});

describe('Schema Constraints', () => {
  it('rejects duplicate requirement codes', () => {
    expect(() => {
      db.prepare(
        "INSERT INTO requirements (code, title, type, priority, status) VALUES ('REQ-001', 'Duplicate', 'Functional', 'Must', 'Proposed')"
      ).run();
    }).toThrow();
  });

  it('rejects duplicate activity codes', () => {
    expect(() => {
      db.prepare(
        "INSERT INTO activities (code, name, duration, planned_start, planned_end) VALUES ('ACT-001', 'Duplicate', 5, '2026-09-07', '2026-09-11')"
      ).run();
    }).toThrow();
  });

  it('rejects duplicate change request codes', () => {
    expect(() => {
      db.prepare(
        "INSERT INTO change_requests (code, title, requested_by) VALUES ('CR-001', 'Dup', 'Test')"
      ).run();
    }).toThrow();
  });

  it('enforces planned_end >= planned_start for activities', () => {
    expect(() => {
      db.prepare(
        "INSERT INTO activities (code, name, duration, planned_start, planned_end) VALUES ('ACT-999', 'Bad Dates', 5, '2026-09-11', '2026-09-07')"
      ).run();
    }).toThrow();
  });

  it('enforces percent_complete between 0 and 100', () => {
    expect(() => {
      db.prepare(
        "INSERT INTO activities (code, name, duration, planned_start, planned_end, percent_complete) VALUES ('ACT-998', 'Over', 5, '2026-09-07', '2026-09-11', 150)"
      ).run();
    }).toThrow();

    expect(() => {
      db.prepare(
        "INSERT INTO activities (code, name, duration, planned_start, planned_end, percent_complete) VALUES ('ACT-997', 'Under', 5, '2026-09-07', '2026-09-11', -10)"
      ).run();
    }).toThrow();
  });

  it('enforces duration > 0 for activities', () => {
    expect(() => {
      db.prepare(
        "INSERT INTO activities (code, name, duration, planned_start, planned_end) VALUES ('ACT-996', 'Zero', 0, '2026-09-07', '2026-09-07')"
      ).run();
    }).toThrow();
  });

  it('enforces expense amount > 0', () => {
    expect(() => {
      db.prepare(
        "INSERT INTO expenses (activity_id, date, amount) VALUES (1, '2026-10-01', -500)"
      ).run();
    }).toThrow();
  });

  it('enforces risk likelihood between 1 and 5', () => {
    expect(() => {
      db.prepare(
        "INSERT INTO risks (code, title, likelihood, impact, score) VALUES ('RSK-999', 'Bad', 0, 3, 0)"
      ).run();
    }).toThrow();

    expect(() => {
      db.prepare(
        "INSERT INTO risks (code, title, likelihood, impact, score) VALUES ('RSK-998', 'Bad', 6, 3, 18)"
      ).run();
    }).toThrow();
  });

  it('enforces approved_budget >= 0 for charter', () => {
    expect(() => {
      db.prepare(
        "INSERT INTO project_charter (title, approved_budget, start_date, end_date, sponsor, project_manager) VALUES ('Test', -100, '2026-01-01', '2026-12-31', 'S', 'PM')"
      ).run();
    }).toThrow();
  });
});

describe('Referential Integrity', () => {
  it('enforces FK: activity → team_member', () => {
    // Non-existent team member ID
    expect(() => {
      db.prepare(
        "INSERT INTO activities (code, name, assignee_id, duration, planned_start, planned_end) VALUES ('ACT-990', 'Bad FK', 999, 5, '2026-09-07', '2026-09-11')"
      ).run();
    }).toThrow();
  });

  it('enforces FK: expense → activity', () => {
    expect(() => {
      db.prepare(
        "INSERT INTO expenses (activity_id, date, amount) VALUES (999, '2026-10-01', 1000)"
      ).run();
    }).toThrow();
  });

  it('enforces FK: wbs_item → requirement', () => {
    expect(() => {
      db.prepare(
        "INSERT INTO wbs_items (code, title, requirement_id, is_work_package, sort_order) VALUES ('9.9.9', 'Bad FK', 999, 1, 99)"
      ).run();
    }).toThrow();
  });

  it('cascade deletes: removing a checklist removes its items', () => {
    const before = db.prepare("SELECT COUNT(*) as cnt FROM checklist_items WHERE checklist_id = 1").get();
    expect(before.cnt).toBeGreaterThan(0);

    db.prepare("DELETE FROM inspection_results WHERE checklist_item_id IN (SELECT id FROM checklist_items WHERE checklist_id = 1)").run();
    db.prepare("DELETE FROM checklist_items WHERE checklist_id = 1").run();

    const after = db.prepare("SELECT COUNT(*) as cnt FROM checklist_items WHERE checklist_id = 1").get();
    expect(after.cnt).toBe(0);
  });

  it('prevents self-dependency in activity_dependencies', () => {
    expect(() => {
      db.prepare(
        "INSERT INTO activity_dependencies (activity_id, predecessor_id) VALUES (1, 1)"
      ).run();
    }).toThrow();
  });
});

describe('Seed Data Integrity', () => {
  it('has exactly 7 team members', () => {
    const count = db.prepare('SELECT COUNT(*) as cnt FROM team_members').get();
    expect(count.cnt).toBe(7);
  });

  it('has 17 requirements (15 approved/implemented + 2 proposed)', () => {
    const count = db.prepare('SELECT COUNT(*) as cnt FROM requirements').get();
    expect(count.cnt).toBe(17);

    const proposed = db.prepare("SELECT COUNT(*) as cnt FROM requirements WHERE status = 'Proposed'").get();
    expect(proposed.cnt).toBe(2);
  });

  it('has 25 activities with total estimated_cost = 5,000,000', () => {
    const count = db.prepare('SELECT COUNT(*) as cnt FROM activities').get();
    expect(count.cnt).toBe(25);

    const sum = db.prepare('SELECT SUM(estimated_cost) as total FROM activities').get();
    expect(sum.total).toBe(5000000);
  });

  it('has 2 change requests with total cost_impact = 800,000', () => {
    const sum = db.prepare('SELECT SUM(cost_impact) as total FROM change_requests').get();
    expect(sum.total).toBe(800000);
  });

  it('has 10 defects with 2 Critical, 2 High', () => {
    const count = db.prepare('SELECT COUNT(*) as cnt FROM defects').get();
    expect(count.cnt).toBe(10);

    const crit = db.prepare("SELECT COUNT(*) as cnt FROM defects WHERE severity = 'Critical'").get();
    expect(crit.cnt).toBe(2);

    const high = db.prepare("SELECT COUNT(*) as cnt FROM defects WHERE severity = 'High'").get();
    expect(high.cnt).toBe(2);
  });

  it('has 10 risks with scores computed correctly', () => {
    const risks = db.prepare('SELECT * FROM risks').all();
    expect(risks.length).toBe(10);

    for (const r of risks) {
      expect(r.score).toBe(r.likelihood * r.impact);
    }
  });

  it('has 5 milestones', () => {
    const count = db.prepare('SELECT COUNT(*) as cnt FROM milestones').get();
    expect(count.cnt).toBe(5);
  });

  it('has 4 quality checklists with 19 total items', () => {
    const clCount = db.prepare('SELECT COUNT(*) as cnt FROM quality_checklists').get();
    expect(clCount.cnt).toBe(4);

    const itemCount = db.prepare('SELECT COUNT(*) as cnt FROM checklist_items').get();
    expect(itemCount.cnt).toBe(19);
  });

  it('has PDPC tree with 3 objectives and their children', () => {
    const objectives = db.prepare("SELECT COUNT(*) as cnt FROM pdpc_items WHERE node_type = 'objective'").get();
    expect(objectives.cnt).toBe(3);

    const total = db.prepare('SELECT COUNT(*) as cnt FROM pdpc_items').get();
    expect(total.cnt).toBe(24);
  });
});
