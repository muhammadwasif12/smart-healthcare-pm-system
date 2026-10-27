/**
 * Delay Analysis Tests — tests/delay.test.js
 *
 * Tests delay detection, cascade through successors, and deadline impact.
 */

const { findDelayedActivities, cascadeDelay, buildSuccessorMap } = require('../server/services/delayAnalysis');
const { createTestDb } = require('./setup');

describe('findDelayedActivities', () => {
  it('identifies activities past their planned end and not 100% complete', () => {
    const activities = [
      { id: 1, code: 'A1', name: 'Done', planned_end: '2026-10-15', actual_finish: '2026-10-15', percent_complete: 100 },
      { id: 2, code: 'A2', name: 'Late', planned_end: '2026-10-15', actual_finish: null, percent_complete: 80 },
      { id: 3, code: 'A3', name: 'Late+Finished', planned_end: '2026-10-15', actual_finish: '2026-10-20', percent_complete: 100 },
      { id: 4, code: 'A4', name: 'Future', planned_end: '2026-12-01', actual_finish: null, percent_complete: 0 },
    ];

    const delayed = findDelayedActivities(activities, '2026-11-01');

    // A2 is delayed (past end, not 100%)
    expect(delayed.some(d => d.id === 2)).toBe(true);
    // A3 is delayed (finished after planned end)
    expect(delayed.some(d => d.id === 3)).toBe(true);
    // A1 is not delayed (finished on time)
    expect(delayed.some(d => d.id === 1)).toBe(false);
    // A4 is not delayed (not past planned end yet)
    expect(delayed.some(d => d.id === 4)).toBe(false);
  });

  it('computes correct delay days', () => {
    const activities = [
      { id: 1, code: 'A1', name: 'Late', planned_end: '2026-10-22', actual_finish: null, percent_complete: 65 },
    ];
    const delayed = findDelayedActivities(activities, '2026-11-01');
    expect(delayed[0].delay_days).toBe(10); // Oct 22 to Nov 1 = 10 days
  });
});

describe('cascadeDelay', () => {
  it('propagates delay through successor chain', () => {
    // A→B→C, A is delayed by 5 days
    const deps = [
      { predecessor_id: 1, activity_id: 2, lag_days: 0 },
      { predecessor_id: 2, activity_id: 3, lag_days: 0 },
    ];
    const actMap = new Map([
      [1, { id: 1, code: 'A', name: 'A', planned_start: '2026-10-01', planned_end: '2026-10-10' }],
      [2, { id: 2, code: 'B', name: 'B', planned_start: '2026-10-11', planned_end: '2026-10-20' }],
      [3, { id: 3, code: 'C', name: 'C', planned_start: '2026-10-21', planned_end: '2026-10-30' }],
    ]);
    const succMap = buildSuccessorMap(deps);

    const impacted = cascadeDelay(1, 5, succMap, actMap);

    expect(impacted.length).toBe(2); // B and C affected
    expect(impacted.find(i => i.id === 2).cascaded_delay_days).toBe(5);
    expect(impacted.find(i => i.id === 3).cascaded_delay_days).toBe(5);
  });

  it('handles fan-out (one delayed task affects multiple successors)', () => {
    // A→B, A→C, A→D
    const deps = [
      { predecessor_id: 1, activity_id: 2, lag_days: 0 },
      { predecessor_id: 1, activity_id: 3, lag_days: 0 },
      { predecessor_id: 1, activity_id: 4, lag_days: 0 },
    ];
    const actMap = new Map([
      [1, { id: 1, code: 'A', name: 'A', planned_start: '2026-10-01', planned_end: '2026-10-05' }],
      [2, { id: 2, code: 'B', name: 'B', planned_start: '2026-10-06', planned_end: '2026-10-10' }],
      [3, { id: 3, code: 'C', name: 'C', planned_start: '2026-10-06', planned_end: '2026-10-15' }],
      [4, { id: 4, code: 'D', name: 'D', planned_start: '2026-10-06', planned_end: '2026-10-20' }],
    ]);
    const succMap = buildSuccessorMap(deps);

    const impacted = cascadeDelay(1, 3, succMap, actMap);
    expect(impacted.length).toBe(3);
    expect(impacted.every(i => i.cascaded_delay_days === 3)).toBe(true);
  });
});

describe('Delay analysis with seed data', () => {
  it('detects delayed activities in the seed data', async () => {
    const db = await createTestDb();
    const activities = db.prepare('SELECT * FROM activities ORDER BY id').all();
    const statusDate = '2026-12-01';

    const delayed = findDelayedActivities(activities, statusDate);

    // Activities 7, 9, 11, 12, 13 are delayed
    // (planned_end < 2026-12-01 and percent_complete < 100)
    expect(delayed.length).toBeGreaterThan(0);

    // Activity 7 (Appointment Scheduling): planned_end=Nov 15, 65% complete
    const act7 = delayed.find(d => d.id === 7);
    expect(act7).toBeDefined();
    expect(act7.delay_days).toBe(16); // Nov 15 to Dec 1

    // Activity 12 (Patient Records): planned_end=Nov 08, 78% complete
    const act12 = delayed.find(d => d.id === 12);
    expect(act12).toBeDefined();
    expect(act12.delay_days).toBe(23); // Nov 08 to Dec 1

    db.close();
  });

  it('cascades delays to successor activities', async () => {
    const db = await createTestDb();
    const activities = db.prepare('SELECT * FROM activities ORDER BY id').all();
    const deps = db.prepare('SELECT * FROM activity_dependencies').all();
    const statusDate = '2026-12-01';

    const delayed = findDelayedActivities(activities, statusDate);
    const actMap = new Map(activities.map(a => [a.id, a]));
    const succMap = buildSuccessorMap(deps);

    // Cascade from activity 7 (Appointment Scheduling, delayed 16 days)
    const act7delay = delayed.find(d => d.id === 7);
    expect(act7delay).toBeDefined();

    const impacted = cascadeDelay(7, act7delay.delay_days, succMap, actMap);

    // Activity 16 (Integration Testing) should be impacted since it depends on 7
    const act16impact = impacted.find(i => i.id === 16);
    expect(act16impact).toBeDefined();
    expect(act16impact.cascaded_delay_days).toBeGreaterThan(0);

    db.close();
  });
});
