/**
 * Earned Value Management (EVM) Service — server/services/evm.js
 * 
 * Computes ALL EVM metrics as of a given status date.
 * Uses inclusive calendar days for PV proration (consistent with scheduler.js).
 * Division-by-zero safe — returns null for undefined ratios.
 *
 * FORMULAS:
 *   BAC = sum of all activity estimated_cost values (Budget at Completion)
 *   PV  = Planned Value: cost of work scheduled by status date
 *         • If activity planned_end <= status_date: PV += full estimated_cost
 *         • If activity planned_start > status_date: PV += 0
 *         • Otherwise: PV += estimated_cost × (elapsed days / total duration)
 *         • elapsed = status_date − planned_start + 1 (inclusive)
 *         • total   = planned_end − planned_start + 1 (inclusive)
 *   EV  = Earned Value: sum(latest progress_log percent_complete × estimated_cost)
 *         where the log date is on or before the status date
 *   AC  = Actual Cost: sum of all expenses with date <= status_date
 *   CV  = Cost Variance       = EV − AC      (negative = over budget)
 *   SV  = Schedule Variance   = EV − PV      (negative = behind schedule)
 *   CPI = Cost Performance Index   = EV / AC  (< 1 = over budget)
 *   SPI = Schedule Performance Idx = EV / PV  (< 1 = behind schedule)
 *   EAC = Estimate at Completion   = BAC / CPI
 *   ETC = Estimate to Complete     = EAC − AC
 *   VAC = Variance at Completion   = BAC − EAC
 *   TCPI = To-Complete Perf Index  = (BAC − EV) / (BAC − AC)
 */

const { getDb } = require('../db/connection');
const { diffDays } = require('./scheduler');

/**
 * Safe division: returns null if divisor is zero.
 */
function safeDivide(numerator, divisor) {
  if (divisor === 0 || divisor === null || divisor === undefined) return null;
  return numerator / divisor;
}

/**
 * Compute PV for a single activity at the given status date.
 * Uses linear proration based on inclusive calendar days.
 *
 * @param {Object} activity  — row from activities table
 * @param {string} statusDate — 'YYYY-MM-DD'
 * @param {string} projectStart — 'YYYY-MM-DD' (defaults to '2026-09-07')
 * @returns {number} planned value for this activity
 */
function computeActivityPV(activity, statusDate, projectStart = '2026-09-07') {
  const cost = activity.estimated_cost || 0;
  if (cost === 0) return 0;
  if (statusDate <= projectStart) return 0;

  const planStart = activity.planned_start;
  const planEnd   = activity.planned_end;

  // Activity fully scheduled before or on status date
  if (planEnd <= statusDate) return cost;

  // Activity hasn't started yet in the plan
  if (planStart > statusDate) return 0;

  // Activity is in progress at status date — linearly prorate
  // Inclusive: duration = end − start + 1, elapsed = statusDate − start + 1
  const totalDuration = diffDays(planStart, planEnd) + 1;   // inclusive
  const elapsedDays   = diffDays(planStart, statusDate) + 1; // inclusive

  if (totalDuration <= 0) return cost; // safety
  return cost * (elapsedDays / totalDuration);
}

/**
 * Compute EV for a single activity as of the given status date.
 * Prorates work performed up to the status date.
 *
 * @param {Object} activity — row from activities table
 * @param {string} statusDate — 'YYYY-MM-DD'
 * @param {string} projectStart — 'YYYY-MM-DD'
 * @param {string} referenceDate — 'YYYY-MM-DD' (seed baseline status date)
 * @returns {number} earned value for this activity
 */
function computeActivityEV(activity, statusDate, projectStart = '2026-09-07', referenceDate = '2026-12-01', loggedPercent = 0) {
  const cost = activity.estimated_cost || 0;
  if (cost === 0) return 0;
  if (statusDate <= projectStart) return 0;
  return cost * (loggedPercent / 100);
}

/**
 * Compute all EVM metrics as of the given status date.
 * 
 * @param {string} statusDate — 'YYYY-MM-DD' (from settings table)
 * @returns {Object} All EVM values: BAC, PV, EV, AC, CV, SV, CPI, SPI, EAC, ETC, VAC, TCPI
 */
async function computeEVM(statusDate, customDb = null) {
  const db = customDb || await getDb();

  const charter = db.prepare('SELECT start_date, end_date FROM project_charter LIMIT 1').get();
  const projectStart = charter ? charter.start_date : '2026-09-07';

  // Get all activities
  const activities = db.prepare('SELECT * FROM activities').all();

  // BAC = sum of all estimated costs
  const BAC = activities.reduce((sum, a) => sum + (a.estimated_cost || 0), 0);

  // PV = sum of planned value per activity as of status date
  const PV = activities.reduce((sum, a) => sum + computeActivityPV(a, statusDate, projectStart), 0);

  // EV = sum of earned value per activity as of status date
  const EV = activities.reduce((sum, a) => {
    const progress = db.prepare(`
      SELECT percent_complete
      FROM progress_log
      WHERE activity_id = ? AND date <= ?
      ORDER BY date DESC, id DESC
      LIMIT 1
    `).get(a.id, statusDate);
    return sum + computeActivityEV(a, statusDate, projectStart, '2026-12-01', progress?.percent_complete || 0);
  }, 0);

  // AC = sum of all expenses on or before the status date
  const acRow = db.prepare(
    'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date <= ?'
  ).get(statusDate);
  const AC = acRow ? acRow.total : 0;

  // Derived metrics
  const CV  = EV - AC;
  const SV  = EV - PV;
  const CPI = safeDivide(EV, AC);
  const SPI = safeDivide(EV, PV);
  const EAC = CPI ? safeDivide(BAC, CPI) : null;
  const ETC = EAC !== null ? EAC - AC : null;
  const VAC = EAC !== null ? BAC - EAC : null;
  const TCPI = safeDivide(BAC - EV, BAC - AC);

  return {
    BAC: Math.round(BAC),
    PV:  Math.round(PV * 100) / 100,  // Keep some precision for display
    EV:  Math.round(EV * 100) / 100,
    AC:  Math.round(AC),
    CV:  Math.round(CV * 100) / 100,
    SV:  Math.round(SV * 100) / 100,
    CPI: CPI !== null ? Math.round(CPI * 1000) / 1000 : null,
    SPI: SPI !== null ? Math.round(SPI * 1000) / 1000 : null,
    EAC: EAC !== null ? Math.round(EAC) : null,
    ETC: ETC !== null ? Math.round(ETC) : null,
    VAC: VAC !== null ? Math.round(VAC) : null,
    TCPI: TCPI !== null ? Math.round(TCPI * 1000) / 1000 : null,
  };
}

/**
 * Generate EVM threshold alerts based on CPI/SPI and configurable thresholds.
 * 
 * @param {Object} evm — computed EVM values
 * @param {Object} thresholds — { cpiWarning, cpiCritical, spiWarning, spiCritical }
 * @returns {Array<{type: string, level: string, message: string}>}
 */
function generateAlerts(evm, thresholds) {
  const alerts = [];
  const { CPI, SPI } = evm;
  const { cpiWarning, cpiCritical, spiWarning, spiCritical } = thresholds;

  if (CPI !== null) {
    if (CPI < cpiCritical) {
      alerts.push({
        type: 'cost',
        level: 'critical',
        message: `CRITICAL: Cost overrun detected: CPI = ${CPI.toFixed(2)} (threshold: ${cpiCritical})`,
      });
    } else if (CPI < cpiWarning) {
      alerts.push({
        type: 'cost',
        level: 'warning',
        message: `WARNING: Cost overrun detected: CPI = ${CPI.toFixed(2)} (threshold: ${cpiWarning})`,
      });
    }
  }

  if (SPI !== null) {
    if (SPI < spiCritical) {
      alerts.push({
        type: 'schedule',
        level: 'critical',
        message: `CRITICAL: Schedule deviation: SPI = ${SPI.toFixed(2)} (threshold: ${spiCritical})`,
      });
    } else if (SPI < spiWarning) {
      alerts.push({
        type: 'schedule',
        level: 'warning',
        message: `WARNING: Schedule deviation: SPI = ${SPI.toFixed(2)} (threshold: ${spiWarning})`,
      });
    }
  }

  return alerts;
}

/**
 * Get thresholds from the settings table (with defaults).
 */
async function getThresholds() {
  const db = await getDb();
  const getVal = (key, def) => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? parseFloat(row.value) : def;
  };
  return {
    cpiWarning:  getVal('cpi_warning_threshold',  0.90),
    cpiCritical: getVal('cpi_critical_threshold', 0.80),
    spiWarning:  getVal('spi_warning_threshold',  0.90),
    spiCritical: getVal('spi_critical_threshold', 0.80),
  };
}

/**
 * Save an EVM snapshot to the database.
 */
async function saveSnapshot(evm, statusDate) {
  const db = await getDb();
  db.prepare(`
    INSERT INTO evm_snapshots (snapshot_date, bac, pv, ev, ac, cv, sv, cpi, spi, eac, etc_val, vac, tcpi)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    statusDate, evm.BAC, evm.PV, evm.EV, evm.AC,
    evm.CV, evm.SV, evm.CPI, evm.SPI,
    evm.EAC, evm.ETC, evm.VAC, evm.TCPI
  );
}

/**
 * Get all EVM snapshots for trend/S-curve charts.
 */
async function getSnapshots() {
  const db = await getDb();
  return db.prepare('SELECT * FROM evm_snapshots ORDER BY snapshot_date ASC').all();
}

module.exports = {
  computeEVM,
  computeActivityPV,
  computeActivityEV,
  generateAlerts,
  getThresholds,
  saveSnapshot,
  getSnapshots,
  safeDivide,
};
