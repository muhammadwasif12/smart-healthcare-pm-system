const path = require('path');
const Db = require(path.join(__dirname, '..', 'server', 'node_modules', 'better-sqlite3'));
const fs = require('fs');

const db = new Db(':memory:');
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8'));
db.exec(fs.readFileSync(path.join(__dirname, '..', 'database', 'seed.sql'), 'utf8'));

// AC
const ac = db.prepare("SELECT SUM(amount) as total FROM expenses WHERE date <= '2026-11-01'").get();
console.log('AC total:', ac.total);

// EV
const activities = db.prepare('SELECT * FROM activities').all();
let ev = 0;
activities.forEach(a => { ev += (a.percent_complete / 100) * a.estimated_cost; });
console.log('EV:', ev);
console.log('CPI:', (ev / ac.total).toFixed(4));

// PV
const statusDate = '2026-11-01';
let pv = 0;
activities.forEach(a => {
  if (a.planned_end <= statusDate) { pv += a.estimated_cost; }
  else if (a.planned_start > statusDate) { /* pv += 0 */ }
  else {
    const sd = new Date(a.planned_start + 'T00:00:00Z');
    const ed = new Date(a.planned_end + 'T00:00:00Z');
    const st = new Date(statusDate + 'T00:00:00Z');
    const total = Math.round((ed - sd) / 86400000) + 1;
    const elapsed = Math.round((st - sd) / 86400000) + 1;
    pv += a.estimated_cost * (elapsed / total);
  }
});
console.log('PV:', Math.round(pv));
console.log('SPI:', (ev / pv).toFixed(4));

// Per-activity AC
console.log('\n--- Per Activity AC ---');
const exps = db.prepare('SELECT activity_id, SUM(amount) as total FROM expenses GROUP BY activity_id ORDER BY activity_id').all();
exps.forEach(e => {
  const act = db.prepare('SELECT code, name, estimated_cost, percent_complete FROM activities WHERE id = ?').get(e.activity_id);
  console.log(`Act ${e.activity_id} (${act.code}): Budget=${act.estimated_cost}, AC=${e.total}, %=${act.percent_complete}`);
});

// Target: CPI = 0.85 → AC should be EV / 0.85 = 3572400 / 0.85 = 4202824
console.log('\nTarget AC for CPI=0.85:', Math.round(ev / 0.85));
console.log('Current AC:', ac.total);
console.log('Need to ADD:', Math.round(ev / 0.85) - ac.total);

db.close();
