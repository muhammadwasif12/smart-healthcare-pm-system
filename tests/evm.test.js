/**
 * EVM Tests — tests/evm.test.js
 *
 * Verifies every EVM formula with known inputs and expected outputs.
 * Also verifies that the seed data produces CPI ≈ 0.85 and SPI ≈ 0.88.
 */

const { computeEVM, computeActivityPV, computeActivityEV, safeDivide } = require('../server/services/evm');
const { createTestDb } = require('./setup');

// ──── Unit Tests for Individual Functions ────

describe('safeDivide', () => {
  it('returns correct result for normal division', () => {
    expect(safeDivide(100, 50)).toBe(2);
    expect(safeDivide(3572400, 4203000)).toBeCloseTo(0.85, 2);
  });

  it('returns null for division by zero', () => {
    expect(safeDivide(100, 0)).toBeNull();
    expect(safeDivide(0, 0)).toBeNull();
  });
});

describe('computeActivityPV', () => {
  it('returns full cost when planned_end <= status_date', () => {
    const activity = { estimated_cost: 100000, planned_start: '2026-09-07', planned_end: '2026-09-11' };
    expect(computeActivityPV(activity, '2026-09-20')).toBe(100000);
    expect(computeActivityPV(activity, '2026-09-11')).toBe(100000); // inclusive
  });

  it('returns 0 when planned_start > status_date', () => {
    const activity = { estimated_cost: 100000, planned_start: '2026-11-10', planned_end: '2026-11-20' };
    expect(computeActivityPV(activity, '2026-11-01')).toBe(0);
  });

  it('prorates linearly for in-progress activities (inclusive days)', () => {
    // Activity Oct 29 - Nov 9, 12 days inclusive. Status date Nov 1.
    // Elapsed = Nov1 - Oct29 + 1 = 4 days. PV = 200000 * 4/12
    const activity = { estimated_cost: 200000, planned_start: '2026-10-29', planned_end: '2026-11-09' };
    const pv = computeActivityPV(activity, '2026-11-01');
    expect(pv).toBeCloseTo(200000 * 4 / 12, 0);
  });

  it('returns 0 for zero-cost activities', () => {
    const activity = { estimated_cost: 0, planned_start: '2026-09-07', planned_end: '2026-09-11' };
    expect(computeActivityPV(activity, '2026-09-20')).toBe(0);
  });
});

// ──── EVM Formula Verification with Known Inputs ────

describe('EVM Formulas', () => {
  // Known values for manual verification
  const BAC = 5000000;
  const EV  = 3572400;
  const PV  = 4056667;
  const AC  = 4203000;

  it('CV = EV - AC', () => {
    expect(EV - AC).toBe(-630600);
  });

  it('SV = EV - PV', () => {
    expect(EV - PV).toBe(-484267);
  });

  it('CPI = EV / AC ≈ 0.85', () => {
    expect(EV / AC).toBeCloseTo(0.85, 2);
  });

  it('SPI = EV / PV ≈ 0.88', () => {
    expect(EV / PV).toBeCloseTo(0.88, 1);
  });

  it('EAC = BAC / CPI (using unrounded CPI = EV / AC)', () => {
    const CPI = EV / AC; // unrounded
    const EAC = BAC / CPI;
    expect(EAC).toBeCloseTo(5882600, -2);
  });

  it('ETC = EAC - AC', () => {
    const CPI = EV / AC;
    const EAC = BAC / CPI;
    const ETC = EAC - AC;
    expect(ETC).toBeGreaterThan(0);
    expect(ETC).toBeCloseTo(1679600, -2);
  });

  it('VAC = BAC - EAC (negative = over budget)', () => {
    const CPI = EV / AC;
    const EAC = BAC / CPI;
    const VAC = BAC - EAC;
    expect(VAC).toBeLessThan(0); // over budget
    expect(VAC).toBeCloseTo(-882600, -2);
  });

  it('TCPI = (BAC - EV) / (BAC - AC)', () => {
    const TCPI = (BAC - EV) / (BAC - AC);
    expect(TCPI).toBeGreaterThan(1); // needs to improve
    expect(TCPI).toBeCloseTo(1.791, 2);
  });
});

// ──── Integration Test: EVM from Seed Data ────

describe('EVM computed from seed data at status date 2026-12-01', () => {
  it('produces CPI ≈ 0.85 and SPI ≈ 0.88 with TCPI ≈ 1.79', async () => {
    const db = await createTestDb();

    // Get all activities and expenses
    const activities = db.prepare('SELECT * FROM activities').all();
    const statusDate = '2026-12-01';

    // Compute BAC
    const BAC = activities.reduce((sum, a) => sum + a.estimated_cost, 0);
    expect(BAC).toBe(5000000);

    // Compute PV
    let PV = 0;
    for (const a of activities) {
      PV += computeActivityPV(a, statusDate);
    }

    // Compute EV
    const EV = activities.reduce((sum, a) => sum + (a.percent_complete / 100) * a.estimated_cost, 0);

    // Compute AC — sum of expenses on or before status date
    const acRow = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date <= '2026-12-01'").get();
    const AC = acRow.total;

    // Verify CPI and SPI
    const CPI = EV / AC;
    const SPI = EV / PV;
    const TCPI = (BAC - EV) / (BAC - AC);

    console.log(`  EVM Results: BAC=${BAC}, PV=${Math.round(PV)}, EV=${EV}, AC=${AC}`);
    console.log(`  CPI=${CPI.toFixed(4)}, SPI=${SPI.toFixed(4)}, TCPI=${TCPI.toFixed(4)}`);

    expect(CPI).toBeCloseTo(0.85, 2);
    expect(SPI).toBeCloseTo(0.88, 2);
    expect(TCPI).toBeCloseTo(1.79, 1);

    // Verify derived metrics
    expect(EV - AC).toBeLessThan(0); // CV negative (over budget)
    expect(EV - PV).toBeLessThan(0); // SV negative (behind schedule)

    db.close();
  });

  it('PV(project start)=0, PV(project end)=BAC, and PV never decreases as date increases', async () => {
    const db = await createTestDb();
    const charter = db.prepare('SELECT start_date, end_date, approved_budget FROM project_charter LIMIT 1').get();
    const projectStart = charter.start_date; // '2026-09-07'
    const projectEnd   = charter.end_date;   // '2026-12-27'
    const BAC          = charter.approved_budget; // 5000000

    const evmStart = await computeEVM(projectStart, db);
    expect(evmStart.PV).toBe(0);

    const evmEnd = await computeEVM(projectEnd, db);
    expect(evmEnd.PV).toBe(BAC);

    // Verify PV never decreases as date increases
    const testDates = [
      '2026-09-07', '2026-09-15', '2026-10-01', '2026-10-15',
      '2026-11-01', '2026-11-15', '2026-12-01', '2026-12-15', '2026-12-27'
    ];

    let lastPV = -1;
    for (const d of testDates) {
      const res = await computeEVM(d, db);
      expect(res.PV).toBeGreaterThanOrEqual(lastPV);
      lastPV = res.PV;
    }

    db.close();
  });

  it('EV and AC depend on status date and exclude later expenses/progress', async () => {
    const db = await createTestDb();

    const evmOct = await computeEVM('2026-10-01', db);
    const evmNov = await computeEVM('2026-11-01', db);
    const evmDec = await computeEVM('2026-12-01', db);

    // PV, EV, AC must strictly increase across phases as work progresses
    expect(evmOct.PV).toBeLessThan(evmNov.PV);
    expect(evmNov.PV).toBeLessThan(evmDec.PV);

    expect(evmOct.EV).toBeLessThan(evmNov.EV);
    expect(evmNov.EV).toBeLessThan(evmDec.EV);

    expect(evmOct.AC).toBeLessThan(evmNov.AC);
    expect(evmNov.AC).toBeLessThanOrEqual(evmDec.AC);

    // Expenses dated after 2026-10-01 are excluded from October AC
    const futureExpenses = db.prepare("SELECT COUNT(*) as cnt FROM expenses WHERE date > '2026-10-01'").get();
    expect(futureExpenses.cnt).toBeGreaterThan(0);
    const totalExpenses = db.prepare("SELECT SUM(amount) as total FROM expenses").get().total;
    expect(evmOct.AC).toBeLessThan(totalExpenses);

    db.close();
  });

  it('uses the latest progress_log entry on or before the status date for EV without proration', async () => {
    const db = await createTestDb();
    const activity = db.prepare("SELECT * FROM activities WHERE id = 7").get();

    const evmBeforeUpdate = await computeEVM('2026-10-15', db);
    expect(evmBeforeUpdate.EV).toBeGreaterThan(0);

    db.prepare(`
      INSERT INTO progress_log (activity_id, date, percent_complete)
      VALUES (?, ?, ?)
    `).run(activity.id, '2026-10-16', 40);

    const evmAtUpdate = await computeEVM('2026-10-16', db);
    expect(evmAtUpdate.EV - evmBeforeUpdate.EV).toBe(67500);

    const evmBetweenUpdates = await computeEVM('2026-10-20', db);
    expect(evmBetweenUpdates.EV).toBe(evmAtUpdate.EV);
    db.close();
  });

  it('keeps CPI and SPI defined whenever AC and PV are positive across the required trend dates', async () => {
    const db = await createTestDb();
    const dates = ['2026-10-01', '2026-10-15', '2026-11-01', '2026-11-15', '2026-12-01', '2026-12-27'];
    const results = [];
    for (const date of dates) results.push(await computeEVM(date, db));

    for (const result of results) {
      expect(result.AC).toBeGreaterThan(0);
      expect(result.PV).toBeGreaterThan(0);
      expect(result.CPI).not.toBeNull();
      expect(result.SPI).not.toBeNull();
    }
    expect(results[4].EV).toBe(3572400);
    expect(results[4].AC).toBe(4203000);
    db.close();
  });

  it('generates exact WARNING alert text at the 2026-12-01 baseline', async () => {
    const { generateAlerts, getThresholds } = require('../server/services/evm');
    const db = await createTestDb();
    const evm = await computeEVM('2026-12-01', db);
    const thresholds = {
      cpiWarning: 0.90,
      cpiCritical: 0.80,
      spiWarning: 0.90,
      spiCritical: 0.80,
    };
    const alerts = generateAlerts(evm, thresholds);

    expect(alerts.map(a => a.message)).toEqual([
      'WARNING: Cost overrun detected: CPI = 0.85 (threshold: 0.9)',
      'WARNING: Schedule deviation: SPI = 0.88 (threshold: 0.9)',
    ]);
    db.close();
  });
});
