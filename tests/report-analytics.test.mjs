import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { test, after } from "node:test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, root, server: { middlewareMode: true } });
const { analyticsQueries, fillTrend } = await vite.ssrLoadModule("/lib/report-analytics.ts");
after(() => vite.close());

function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE hotspots (id INTEGER PRIMARY KEY, area TEXT, issue TEXT, priority REAL, report_count INTEGER);
    CREATE TABLE complaints (id INTEGER PRIMARY KEY, hotspot_id INTEGER, category TEXT, h3_cell TEXT, created_at TEXT);
    INSERT INTO hotspots VALUES (1, 'Sector 17', 'Water leakage', 8.7, 999), (2, 'Model Town', 'Waste collection', 5, 500);
    INSERT INTO complaints VALUES
      (1, 1, 'Water', 'cell-a', '2026-09-06 11:00:00'),
      (2, 1, 'Water', 'cell-a', '2026-09-06 12:00:00'),
      (3, 2, 'Waste', NULL, '2026-09-05 12:00:00'),
      (4, 1, 'Water', 'cell-a', '2026-08-01 12:00:00'),
      (5, 1, 'Water', 'cell-a', '2026-09-07 12:00:00');`);
  return db;
}

test("analytics counts complaint rows, excludes demo totals and future rows, and includes the period boundary", () => {
  const db = fixture();
  try {
    const query = analyticsQueries("24h", "All", "", new Date("2026-09-06T12:00:00Z"));
    const totals = db.prepare(query.totals).get(...query.bindings);
    assert.deepEqual({ ...totals }, { received: 3, classified: 3, located: 2, zones: 2, criticalZones: 1 });
    const zones = db.prepare(query.zones).all(...query.bindings);
    assert.equal(zones.reduce((sum, row) => sum + row.count, 0), 3);
    const buckets = db.prepare(query.trend).all(...query.bindings);
    const filled = fillTrend("24h", query.start, query.end, buckets);
    assert.equal(filled.length, 25);
    assert.equal(filled.reduce((sum, row) => sum + row.count, 0), 3);
    assert.equal(filled.filter(row => row.count === 0).length, 22);
  } finally { db.close(); }
});

test("category and literal area search apply consistently to totals, zone counts and trend", () => {
  const db = fixture();
  try {
    const query = analyticsQueries("7d", "Water", "sector 17", new Date("2026-09-06T12:00:00Z"));
    assert.equal(db.prepare(query.totals).get(...query.bindings).received, 2);
    assert.equal(db.prepare(query.zones).all(...query.bindings).length, 1);
    assert.equal(db.prepare(query.categories).all(...query.bindings)[0].name, "Water");
    assert.equal(db.prepare(query.trend).all(...query.bindings).reduce((sum, row) => sum + row.count, 0), 2);
    const literal = analyticsQueries("7d", "All", "%", new Date("2026-09-06T12:00:00Z"));
    assert.equal(db.prepare(literal.totals).get(...literal.bindings).received, 0);
  } finally { db.close(); }
});

test("empty six-month history stays zero instead of inventing a trend", () => {
  const query = analyticsQueries("6m", "All", "", new Date("2026-09-06T12:00:00Z"));
  const trend = fillTrend("6m", query.start, query.end, []);
  assert.equal(trend.length, 181);
  assert.ok(trend.every(point => point.count === 0));
});
