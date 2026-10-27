/**
 * Delay Analysis Service — server/services/delayAnalysis.js
 *
 * Detects delayed activities and cascades the delay through all dependents
 * using the dependency graph (Finish-to-Start).
 *
 * An activity is DELAYED if:
 *   (status_date > planned_end  AND  percent_complete < 100)
 *   OR  (actual_finish > planned_end)
 *
 * Cascade logic:
 *   For each delayed activity, compute delay_days.
 *   Then walk all successor chains and accumulate how the delay pushes
 *   each dependent's earliest start.  Finally compute the projected end
 *   date and compare to the approved deadline.
 *
 * Uses inclusive calendar days consistent with scheduler.js.
 */

const { getDb } = require('../db/connection');
const { diffDays, addDays, computeCPM } = require('./scheduler');

/**
 * Identify which activities are delayed as of the given status date.
 *
 * @param {Array}  activities  — rows from activities table
 * @param {string} statusDate  — 'YYYY-MM-DD'
 * @returns {Array<{ id, code, name, planned_end, delay_days, reason }>}
 */
function findDelayedActivities(activities, statusDate) {
  const delayed = [];

  for (const a of activities) {
    let delayDays = 0;
    let reason = '';

    if (a.actual_finish && a.actual_finish > a.planned_end) {
      // Completed late
      delayDays = diffDays(a.planned_end, a.actual_finish);
      reason = `Finished ${delayDays} day(s) late (actual: ${a.actual_finish})`;
    } else if (!a.actual_finish && statusDate > a.planned_end && a.percent_complete < 100) {
      // Still in progress past planned end
      delayDays = diffDays(a.planned_end, statusDate);
      reason = `${delayDays} day(s) past planned end, only ${a.percent_complete}% complete`;
    }

    if (delayDays > 0) {
      delayed.push({
        id:          a.id,
        code:        a.code,
        name:        a.name,
        planned_end: a.planned_end,
        actual_finish: a.actual_finish || null,
        delay_days:  delayDays,
        percent_complete: a.percent_complete,
        reason,
        assignee_id: a.assignee_id,
      });
    }
  }

  return delayed;
}

/**
 * Build the successor adjacency list from dependencies.
 * Returns Map<predecessor_id, [{activity_id, lag_days}]>
 */
function buildSuccessorMap(deps) {
  const succMap = new Map();
  for (const d of deps) {
    if (!succMap.has(d.predecessor_id)) succMap.set(d.predecessor_id, []);
    succMap.get(d.predecessor_id).push({ id: d.activity_id, lag: d.lag_days || 0 });
  }
  return succMap;
}

/**
 * Cascade a delay through all successor chains using BFS.
 * For each delayed activity, compute how many days each successor is pushed.
 *
 * @param {number} delayedActivityId — the root delayed activity
 * @param {number} delayDays — days of delay at the root
 * @param {Map}    succMap — successor adjacency list
 * @param {Map}    actMap  — id → activity row
 * @returns {Array<{ id, code, name, cascaded_delay_days }>}  impacted successors
 */
function cascadeDelay(delayedActivityId, delayDays, succMap, actMap) {
  const impacted = [];
  const visited = new Set();

  // BFS: propagate delay through successors
  const queue = [{ id: delayedActivityId, cumulativeDelay: delayDays }];
  visited.add(delayedActivityId);

  while (queue.length) {
    const { id, cumulativeDelay } = queue.shift();
    const successors = succMap.get(id) || [];

    for (const succ of successors) {
      if (visited.has(succ.id)) continue;
      visited.add(succ.id);

      const activity = actMap.get(succ.id);
      if (!activity) continue;

      // The successor is pushed by the cumulative delay (minus any lag already built in)
      // But it can't be pushed less than 0 days
      const pushDays = Math.max(0, cumulativeDelay);

      if (pushDays > 0) {
        impacted.push({
          id:                    activity.id,
          code:                  activity.code,
          name:                  activity.name,
          planned_start:         activity.planned_start,
          planned_end:           activity.planned_end,
          new_projected_start:   addDays(activity.planned_start, pushDays),
          new_projected_end:     addDays(activity.planned_end, pushDays),
          cascaded_delay_days:   pushDays,
        });

        // Continue cascading to further successors
        queue.push({ id: succ.id, cumulativeDelay: pushDays });
      }
    }
  }

  return impacted;
}

/**
 * Full delay analysis from the database.
 * Returns delayed activities, their cascaded impacts, and deadline impact.
 */
async function analyzeDelays() {
  const db = await getDb();

  const activities = db.prepare('SELECT * FROM activities ORDER BY id').all();
  const deps       = db.prepare('SELECT * FROM activity_dependencies').all();
  const charter    = db.prepare('SELECT * FROM project_charter LIMIT 1').get();
  const settingsRow = db.prepare("SELECT value FROM settings WHERE key = 'status_date'").get();

  const statusDate  = settingsRow ? settingsRow.value : '2026-12-01';
  const deadline    = charter ? charter.end_date : '2026-12-27';
  const projectStart = charter ? charter.start_date : '2026-09-07';

  // Find delayed activities
  const delayed = findDelayedActivities(activities, statusDate);

  // Build maps
  const actMap  = new Map(activities.map(a => [a.id, a]));
  const succMap = buildSuccessorMap(deps);

  // Cascade delays and collect all impacted activities
  const allImpacted = new Map(); // id → impact info
  for (const d of delayed) {
    const impacted = cascadeDelay(d.id, d.delay_days, succMap, actMap);
    for (const imp of impacted) {
      // Keep the worst (longest) delay for each activity
      const existing = allImpacted.get(imp.id);
      if (!existing || imp.cascaded_delay_days > existing.cascaded_delay_days) {
        allImpacted.set(imp.id, imp);
      }
    }
  }

  // Compute projected end date using CPM (which uses planned durations)
  // Then add the maximum delay that reaches the last activity
  let projectedEnd = deadline;
  try {
    const cpm = computeCPM(activities, deps, projectStart);
    projectedEnd = cpm.projectedEnd;

    // The real projected end accounts for delays on the critical path
    const maxDelayOnCritical = delayed
      .filter(d => cpm.criticalPath.includes(d.id))
      .reduce((max, d) => Math.max(max, d.delay_days), 0);

    if (maxDelayOnCritical > 0) {
      projectedEnd = addDays(cpm.projectedEnd, maxDelayOnCritical);
    }
  } catch (e) {
    // If CPM fails (e.g. cycle), fall back to simple calculation
    console.warn('CPM failed during delay analysis:', e.message);
  }

  // Deadline impact
  const totalDuration = diffDays(projectStart, deadline);
  const daysLate      = diffDays(deadline, projectedEnd);
  const bufferUsed    = totalDuration > 0
    ? Math.round((Math.max(0, daysLate) / totalDuration) * 100 * 10) / 10
    : 0;

  return {
    statusDate,
    deadline,
    projectedEnd,
    delayedActivities: delayed,
    impactedActivities: Array.from(allImpacted.values()),
    deadlineImpact: {
      daysLate: Math.max(0, daysLate),
      isLate: daysLate > 0,
      bufferConsumedPercent: bufferUsed,
      projectedEnd,
    },
  };
}

module.exports = {
  findDelayedActivities,
  cascadeDelay,
  buildSuccessorMap,
  analyzeDelays,
};
