/**
 * CPM and Critical Path Tests — tests/cpm.test.js
 *
 * Tests the scheduler service: forward/backward pass, critical path,
 * circular dependency rejection, and date calculations.
 */

const { computeCPM, detectCycles, addDays, diffDays } = require('../server/services/scheduler');

// ──── Date Helper Tests ────

describe('Date Helpers', () => {
  it('addDays adds calendar days correctly', () => {
    expect(addDays('2026-09-07', 0)).toBe('2026-09-07');
    expect(addDays('2026-09-07', 1)).toBe('2026-09-08');
    expect(addDays('2026-09-07', 4)).toBe('2026-09-11');
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01'); // month boundary
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01'); // year boundary
  });

  it('diffDays computes difference in calendar days', () => {
    expect(diffDays('2026-09-07', '2026-09-07')).toBe(0);
    expect(diffDays('2026-09-07', '2026-09-11')).toBe(4);
    expect(diffDays('2026-09-07', '2026-12-27')).toBe(111); // 16 weeks - 1
  });
});

// ──── CPM Tests with Known Activities ────

describe('CPM Forward and Backward Pass', () => {
  // Simple 3-activity linear chain: A(3d) → B(2d) → C(4d)
  const simpleActivities = [
    { id: 1, duration: 3 },
    { id: 2, duration: 2 },
    { id: 3, duration: 4 },
  ];
  const simpleDeps = [
    { activity_id: 2, predecessor_id: 1, lag_days: 0 },
    { activity_id: 3, predecessor_id: 2, lag_days: 0 },
  ];

  it('computes ES/EF correctly for linear chain', () => {
    const { results } = computeCPM(simpleActivities, simpleDeps, '2026-01-01');

    // Activity 1: ES=Jan 1, EF=Jan 3 (3 days: Jan 1,2,3)
    expect(results.get(1).ES).toBe('2026-01-01');
    expect(results.get(1).EF).toBe('2026-01-03');

    // Activity 2: ES=Jan 4, EF=Jan 5 (2 days: Jan 4,5)
    expect(results.get(2).ES).toBe('2026-01-04');
    expect(results.get(2).EF).toBe('2026-01-05');

    // Activity 3: ES=Jan 6, EF=Jan 9 (4 days: Jan 6,7,8,9)
    expect(results.get(3).ES).toBe('2026-01-06');
    expect(results.get(3).EF).toBe('2026-01-09');
  });

  it('computes LS/LF correctly (all critical, slack=0)', () => {
    const { results } = computeCPM(simpleActivities, simpleDeps, '2026-01-01');

    // All activities on critical path → LS=ES, LF=EF, slack=0
    expect(results.get(1).LS).toBe('2026-01-01');
    expect(results.get(1).LF).toBe('2026-01-03');
    expect(results.get(1).slack).toBe(0);

    expect(results.get(3).LS).toBe('2026-01-06');
    expect(results.get(3).LF).toBe('2026-01-09');
    expect(results.get(3).slack).toBe(0);
  });

  it('identifies the correct critical path', () => {
    const { criticalPath } = computeCPM(simpleActivities, simpleDeps, '2026-01-01');
    expect(criticalPath).toEqual([1, 2, 3]);
  });

  it('computes projected end date correctly', () => {
    const { projectedEnd } = computeCPM(simpleActivities, simpleDeps, '2026-01-01');
    expect(projectedEnd).toBe('2026-01-09');
  });
});

describe('CPM with Parallel Paths', () => {
  // A(2d) → B(5d) → D(1d)
  // A(2d) → C(3d) → D(1d)
  // Critical path: A→B→D (total 8d), C has 2 days slack
  const activities = [
    { id: 1, duration: 2 }, // A
    { id: 2, duration: 5 }, // B (longer path)
    { id: 3, duration: 3 }, // C (shorter path)
    { id: 4, duration: 1 }, // D
  ];
  const deps = [
    { activity_id: 2, predecessor_id: 1, lag_days: 0 }, // A→B
    { activity_id: 3, predecessor_id: 1, lag_days: 0 }, // A→C
    { activity_id: 4, predecessor_id: 2, lag_days: 0 }, // B→D
    { activity_id: 4, predecessor_id: 3, lag_days: 0 }, // C→D
  ];

  it('correctly identifies the critical path through the longer branch', () => {
    const { results, criticalPath, projectedEnd } = computeCPM(activities, deps, '2026-01-01');

    // A: ES=Jan1, EF=Jan2
    expect(results.get(1).ES).toBe('2026-01-01');
    expect(results.get(1).EF).toBe('2026-01-02');

    // B: ES=Jan3, EF=Jan7 (5 days)
    expect(results.get(2).ES).toBe('2026-01-03');
    expect(results.get(2).EF).toBe('2026-01-07');

    // C: ES=Jan3, EF=Jan5 (3 days)
    expect(results.get(3).ES).toBe('2026-01-03');
    expect(results.get(3).EF).toBe('2026-01-05');

    // D: ES=Jan8, EF=Jan8 (1 day, waits for B)
    expect(results.get(4).ES).toBe('2026-01-08');
    expect(results.get(4).EF).toBe('2026-01-08');

    // C has 2 days slack
    expect(results.get(3).slack).toBe(2);

    // Critical path is A→B→D
    expect(criticalPath).toEqual([1, 2, 4]);

    expect(projectedEnd).toBe('2026-01-08');
  });
});

describe('CPM with Lag', () => {
  it('applies lag days correctly', () => {
    const activities = [
      { id: 1, duration: 3 },
      { id: 2, duration: 2 },
    ];
    const deps = [
      { activity_id: 2, predecessor_id: 1, lag_days: 2 }, // 2-day lag after A
    ];
    const { results } = computeCPM(activities, deps, '2026-01-01');

    // A: Jan1-Jan3
    // B: Jan3 + 1 + 2 lag = Jan6, EF = Jan7
    expect(results.get(2).ES).toBe('2026-01-06');
    expect(results.get(2).EF).toBe('2026-01-07');
  });
});

// ──── Circular Dependency Detection ────

describe('Circular Dependency Detection', () => {
  it('detects a simple cycle: A→B→A', () => {
    const adj = new Map([
      [1, [2]],
      [2, [1]],
    ]);
    const result = detectCycles(adj);
    expect(result.hasCycle).toBe(true);
  });

  it('detects a 3-node cycle: A→B→C→A', () => {
    const adj = new Map([
      [1, [2]],
      [2, [3]],
      [3, [1]],
    ]);
    const result = detectCycles(adj);
    expect(result.hasCycle).toBe(true);
  });

  it('returns false for a valid DAG', () => {
    const adj = new Map([
      [1, []],
      [2, [1]],
      [3, [1]],
      [4, [2, 3]],
    ]);
    const result = detectCycles(adj);
    expect(result.hasCycle).toBe(false);
  });

  it('throws error in computeCPM when cycle exists', () => {
    const activities = [
      { id: 1, duration: 3 },
      { id: 2, duration: 2 },
    ];
    const deps = [
      { activity_id: 2, predecessor_id: 1, lag_days: 0 },
      { activity_id: 1, predecessor_id: 2, lag_days: 0 }, // creates cycle
    ];
    expect(() => computeCPM(activities, deps, '2026-01-01')).toThrow(/[Cc]ircular/);
  });
});

// ──── CPM with Seed Data ────

describe('CPM with seed data', () => {
  it('computes a valid critical path for the 25-activity project', async () => {
    const { createTestDb } = require('./setup');
    const db = await createTestDb();

    const activities = db.prepare('SELECT * FROM activities ORDER BY id').all();
    const deps = db.prepare('SELECT * FROM activity_dependencies').all();

    expect(activities.length).toBe(25);
    expect(deps.length).toBeGreaterThan(20);

    const { results, criticalPath, projectedEnd } = computeCPM(activities, deps, '2026-09-07');

    // Should have results for all 25 activities
    expect(results.size).toBe(25);

    // Critical path should include activity 1 (start) and 25 (end)
    expect(criticalPath).toContain(1);
    expect(criticalPath).toContain(25);

    // Projected end should be Dec 27
    expect(projectedEnd).toBe('2026-12-27');

    // All activities should have non-negative slack
    for (const [, r] of results) {
      expect(r.slack).toBeGreaterThanOrEqual(0);
    }

    // Critical path activities should have zero slack
    for (const id of criticalPath) {
      expect(results.get(id).slack).toBe(0);
    }

    db.close();
  });
});
