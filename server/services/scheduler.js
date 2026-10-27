/**
 * CPM Scheduling Engine — server/services/scheduler.js
 * 
 * Implements the Critical Path Method (CPM) with forward and backward pass.
 * Uses INCLUSIVE calendar days (start and end dates count as work days).
 * 
 * FORMULAS (corrected per viva requirements):
 *   Forward pass:  ES = max(EF of all predecessors + lag) + 1 day
 *                  EF = ES + duration - 1
 *   Backward pass: LF = min(LS of all successors - lag) - 1 day
 *                  LS = LF - duration + 1
 *   Total Slack  = LS - ES  (or equivalently LF - EF)
 *   Critical path = activities where slack === 0
 *
 * Calendar day convention:
 *   An activity with duration=5 starting 2026-09-07 ends 2026-09-11.
 *   Both start and end dates are inclusive. duration = end - start + 1.
 */

const { getDb } = require('../db/connection');

// ──────────────────────── DATE HELPERS ────────────────────────

/** Parse 'YYYY-MM-DD' to a Date object (midnight UTC) */
function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Format a Date to 'YYYY-MM-DD' */
function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

/** Add `days` calendar days to a date string. addDays('2026-09-07', 1) → '2026-09-08' */
function addDays(dateStr, days) {
  const d = parseDate(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDate(d);
}

/** Difference in calendar days: diffDays('2026-09-07', '2026-09-11') → 4 */
function diffDays(startStr, endStr) {
  const s = parseDate(startStr);
  const e = parseDate(endStr);
  return Math.round((e - s) / (24 * 60 * 60 * 1000));
}

// ──────────────────────── CYCLE DETECTION ────────────────────────

/**
 * Detect circular dependencies using DFS.
 * @param {Map<number, number[]>} adjList  activity_id → [predecessor_ids]
 * @returns {{ hasCycle: boolean, cycle?: number[] }}
 */
function detectCycles(adjList) {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map();
  const parent = new Map();

  for (const id of adjList.keys()) color.set(id, WHITE);

  // DFS from each unvisited node
  for (const start of adjList.keys()) {
    if (color.get(start) !== WHITE) continue;

    const stack = [start];
    while (stack.length) {
      const u = stack[stack.length - 1];

      if (color.get(u) === WHITE) {
        color.set(u, GRAY);
        const preds = adjList.get(u) || [];
        for (const v of preds) {
          if (!color.has(v)) continue; // missing activity
          if (color.get(v) === GRAY) {
            // Found a cycle — reconstruct it
            const cycle = [v, u];
            let cur = u;
            while (cur !== v && parent.has(cur)) {
              cur = parent.get(cur);
              if (cur === v) break;
              cycle.push(cur);
            }
            return { hasCycle: true, cycle };
          }
          if (color.get(v) === WHITE) {
            parent.set(v, u);
            stack.push(v);
          }
        }
      } else {
        color.set(u, BLACK);
        stack.pop();
      }
    }
  }

  return { hasCycle: false };
}

// ──────────────────────── TOPOLOGICAL SORT ────────────────────────

/**
 * Kahn's algorithm for topological ordering.
 * We sort activities so that predecessors come before successors.
 */
function topologicalSort(activities, deps) {
  // Build adjacency: predecessor → successors  and in-degree count
  const successors = new Map(); // pred_id → [activity_ids that depend on it]
  const inDegree   = new Map(); // activity_id → count of predecessors

  for (const a of activities) {
    successors.set(a.id, []);
    inDegree.set(a.id, 0);
  }

  for (const d of deps) {
    if (successors.has(d.predecessor_id)) {
      successors.get(d.predecessor_id).push(d.activity_id);
    }
    inDegree.set(d.activity_id, (inDegree.get(d.activity_id) || 0) + 1);
  }

  // Start with nodes that have no predecessors
  const queue = [];
  for (const a of activities) {
    if (inDegree.get(a.id) === 0) queue.push(a.id);
  }

  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const succ of (successors.get(id) || [])) {
      const newDeg = inDegree.get(succ) - 1;
      inDegree.set(succ, newDeg);
      if (newDeg === 0) queue.push(succ);
    }
  }

  return order;
}

// ──────────────────────── CPM COMPUTATION ────────────────────────

/**
 * Run the full CPM calculation.
 * 
 * @param {Array} activities  — rows from the activities table
 * @param {Array} deps        — rows from the activity_dependencies table
 * @param {string} projectStart — project start date 'YYYY-MM-DD'
 * @returns {{ 
 *   results: Map<id, {ES,EF,LS,LF,slack}>,
 *   criticalPath: number[],
 *   projectedEnd: string 
 * }}
 */
function computeCPM(activities, deps, projectStart) {
  if (!activities.length) {
    return { results: new Map(), criticalPath: [], projectedEnd: projectStart };
  }

  // Build lookup maps
  const actMap = new Map(); // id → activity
  for (const a of activities) actMap.set(a.id, a);

  // predecessors of each activity: activity_id → [{predecessor_id, lag_days}]
  const predMap = new Map();
  // successors of each activity: predecessor_id → [{activity_id, lag_days}]
  const succMap = new Map();

  for (const a of activities) {
    predMap.set(a.id, []);
    succMap.set(a.id, []);
  }

  for (const d of deps) {
    if (!predMap.has(d.activity_id) || !succMap.has(d.predecessor_id)) continue;
    predMap.get(d.activity_id).push({ id: d.predecessor_id, lag: d.lag_days || 0 });
    succMap.get(d.predecessor_id).push({ id: d.activity_id, lag: d.lag_days || 0 });
  }

  // Cycle detection
  const adjList = new Map();
  for (const a of activities) {
    adjList.set(a.id, (predMap.get(a.id) || []).map(p => p.id));
  }
  const cycleResult = detectCycles(adjList);
  if (cycleResult.hasCycle) {
    throw new Error(`Circular dependency detected involving activities: ${cycleResult.cycle.join(' → ')}`);
  }

  // Topological sort
  const order = topologicalSort(activities, deps);

  // Results storage
  const results = new Map(); // id → { ES, EF, LS, LF, slack }

  // ──── FORWARD PASS ────
  // Process in topological order (predecessors first)
  for (const id of order) {
    const act = actMap.get(id);
    if (!act) continue;
    const preds = predMap.get(id) || [];

    let es;
    if (preds.length === 0) {
      // No predecessors: start at project start
      es = projectStart;
    } else {
      // ES = max(EF of predecessor + lag + 1 day) across all predecessors
      let latestStart = null;
      for (const p of preds) {
        const predResult = results.get(p.id);
        if (!predResult) continue;
        // For Finish-to-Start: successor starts the day after predecessor finishes + lag
        const candidateStr = addDays(predResult.EF, 1 + p.lag);
        if (!latestStart || candidateStr > latestStart) {
          latestStart = candidateStr;
        }
      }
      es = latestStart || projectStart;
    }

    // EF = ES + duration - 1 (inclusive)
    const ef = addDays(es, act.duration - 1);

    results.set(id, { ES: es, EF: ef, LS: null, LF: null, slack: null });
  }

  // Projected project end = max of all EF values
  let projectedEnd = projectStart;
  for (const [, r] of results) {
    if (r.EF > projectedEnd) projectedEnd = r.EF;
  }

  // ──── BACKWARD PASS ────
  // Process in reverse topological order (successors first)
  const reverseOrder = [...order].reverse();

  for (const id of reverseOrder) {
    const act = actMap.get(id);
    if (!act) continue;
    const succs = succMap.get(id) || [];

    let lf;
    if (succs.length === 0) {
      // No successors: LF = project end date
      lf = projectedEnd;
    } else {
      // LF = min(LS of successor - lag - 1 day) across all successors
      let earliestFinish = null;
      for (const s of succs) {
        const succResult = results.get(s.id);
        if (!succResult) continue;
        // For FS: predecessor must finish before successor starts - lag
        const candidateStr = addDays(succResult.LS, -1 - s.lag);
        if (!earliestFinish || candidateStr < earliestFinish) {
          earliestFinish = candidateStr;
        }
      }
      lf = earliestFinish || projectedEnd;
    }

    // LS = LF - duration + 1 (inclusive)
    const ls = addDays(lf, -(act.duration - 1));

    const r = results.get(id);
    r.LS = ls;
    r.LF = lf;
    // Total slack = LS - ES (in calendar days)
    r.slack = diffDays(r.ES, r.LS);
  }

  // ──── CRITICAL PATH ────
  // Activities with zero slack, in topological order
  const criticalPath = order.filter(id => {
    const r = results.get(id);
    return r && r.slack === 0;
  });

  return { results, criticalPath, projectedEnd };
}

// ──────────────────────── DATABASE INTEGRATION ────────────────────────

/**
 * Run CPM from the live database data.
 * Returns the computed schedule with critical path.
 */
async function runScheduler() {
  const db = await getDb();

  const activities = db.prepare('SELECT * FROM activities ORDER BY id').all();
  const deps       = db.prepare('SELECT * FROM activity_dependencies').all();
  const charter    = db.prepare('SELECT * FROM project_charter LIMIT 1').get();
  const projectStart = charter ? charter.start_date : '2026-09-07';

  return computeCPM(activities, deps, projectStart);
}

/**
 * Validate that adding a dependency won't create a cycle.
 * @param {number} activityId     — the activity gaining a predecessor
 * @param {number} predecessorId  — the new predecessor
 * @returns {{ valid: boolean, error?: string }}
 */
async function validateDependency(activityId, predecessorId) {
  const db = await getDb();

  // Check both activities exist
  const act  = db.prepare('SELECT id FROM activities WHERE id = ?').get(activityId);
  const pred = db.prepare('SELECT id FROM activities WHERE id = ?').get(predecessorId);
  if (!act)  return { valid: false, error: `Activity ${activityId} not found` };
  if (!pred) return { valid: false, error: `Predecessor ${predecessorId} not found` };
  if (activityId === predecessorId) return { valid: false, error: 'Activity cannot depend on itself' };

  // Check for existing dependency
  const existing = db.prepare(
    'SELECT id FROM activity_dependencies WHERE activity_id = ? AND predecessor_id = ?'
  ).get(activityId, predecessorId);
  if (existing) return { valid: false, error: 'Dependency already exists' };

  // Simulate adding the dependency and check for cycles
  const deps = db.prepare('SELECT * FROM activity_dependencies').all();
  deps.push({ activity_id: activityId, predecessor_id: predecessorId, lag_days: 0 });

  const activities = db.prepare('SELECT * FROM activities').all();
  const adjList = new Map();
  for (const a of activities) adjList.set(a.id, []);
  for (const d of deps) {
    if (adjList.has(d.activity_id)) {
      adjList.get(d.activity_id).push(d.predecessor_id);
    }
  }

  const cycleResult = detectCycles(adjList);
  if (cycleResult.hasCycle) {
    return { valid: false, error: `Adding this dependency would create a circular dependency` };
  }

  return { valid: true };
}

module.exports = {
  computeCPM,
  runScheduler,
  validateDependency,
  detectCycles,
  topologicalSort,
  // Export date helpers for use in other services
  parseDate,
  formatDate,
  addDays,
  diffDays,
};
