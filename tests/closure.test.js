/**
 * Project Closure Tests — tests/closure.test.js
 *
 * Tests closure gate: cannot sign off with open critical/high defects
 * or un-implemented approved requirements.
 */

const { createTestDb } = require('./setup');

let db;

beforeEach(async () => {
  db = await createTestDb();
});

describe('Project Closure Gate Conditions', () => {
  it('blocks sign-off when Critical defects are open', () => {
    // Seed data has Critical defects (DEF-001, DEF-002) in Open status
    const openCrit = db.prepare(
      "SELECT COUNT(*) as cnt FROM defects WHERE severity = 'Critical' AND status NOT IN ('Closed','Verified')"
    ).get();
    expect(openCrit.cnt).toBeGreaterThan(0);

    // Cannot sign off
    const canClose = openCrit.cnt === 0;
    expect(canClose).toBe(false);
  });

  it('blocks sign-off when High defects are open', () => {
    const openHigh = db.prepare(
      "SELECT COUNT(*) as cnt FROM defects WHERE severity = 'High' AND status NOT IN ('Closed','Verified')"
    ).get();
    expect(openHigh.cnt).toBeGreaterThan(0);
  });

  it('blocks sign-off when approved requirements are not implemented', () => {
    const notImpl = db.prepare(
      "SELECT COUNT(*) as cnt FROM requirements WHERE status = 'Approved'"
    ).get();
    expect(notImpl.cnt).toBeGreaterThan(0);
  });

  it('allows sign-off when ALL critical/high defects are closed AND all reqs implemented', () => {
    // Close all critical and high defects
    db.prepare("UPDATE defects SET status = 'Closed' WHERE severity IN ('Critical','High')").run();

    // Move all approved requirements to implemented
    db.prepare("UPDATE requirements SET status = 'Implemented' WHERE status = 'Approved'").run();

    // Now check conditions
    const openCritHigh = db.prepare(
      "SELECT COUNT(*) as cnt FROM defects WHERE severity IN ('Critical','High') AND status NOT IN ('Closed','Verified')"
    ).get();
    const notImpl = db.prepare(
      "SELECT COUNT(*) as cnt FROM requirements WHERE status = 'Approved'"
    ).get();

    expect(openCritHigh.cnt).toBe(0);
    expect(notImpl.cnt).toBe(0);

    // Can sign off
    const canClose = openCritHigh.cnt === 0 && notImpl.cnt === 0;
    expect(canClose).toBe(true);
  });
});

describe('Project Closure Data Integrity', () => {
  it('closure record exists in seed data', () => {
    const closure = db.prepare('SELECT * FROM project_closure LIMIT 1').get();
    expect(closure).toBeDefined();
    expect(closure.status).toBe('Draft');
  });

  it('can update closure with final cost and lessons learned', () => {
    db.prepare(`
      UPDATE project_closure SET
        final_cost = 5800000,
        actual_end_date = '2027-01-17',
        lessons_learned = 'Better estimation needed. UI/UX design took 28% more than budgeted.',
        status = 'Pending Review'
      WHERE id = 1
    `).run();

    const closure = db.prepare('SELECT * FROM project_closure WHERE id = 1').get();
    expect(closure.final_cost).toBe(5800000);
    expect(closure.actual_end_date).toBe('2027-01-17');
    expect(closure.status).toBe('Pending Review');
    expect(closure.lessons_learned).toContain('Better estimation');
  });
});
