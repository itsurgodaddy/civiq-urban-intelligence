import { getD1 } from "@/db";

const seedHotspots = [
  [1, "Sector 17", "Water", "Probable pipeline leakage", 8.7, 37, 270, "Reported", "1.3 km", 50, 42],
  [2, "Sector 24", "Roads", "Recurring road damage", 7.1, 22, 84, "Reported", "0.8 km", 69, 58],
  [3, "Model Town", "Waste", "Uncollected solid waste", 6.4, 19, 41, "Reported", "0.6 km", 30, 62],
  [4, "Rithala", "Electricity", "Streetlight outage cluster", 4.9, 11, 18, "Reported", "0.4 km", 62, 24],
  [5, "Sector 11", "Water", "Low water pressure", 4.3, 8, 12, "Reported", "0.3 km", 35, 30],
] as const;

async function seedDemoData() {
  const db = getD1();
  const statements = seedHotspots.map((row) => db.prepare(`
    INSERT OR IGNORE INTO hotspots
      (id, area, category, issue, priority, report_count, growth, status, radius, position_left, position_top)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(...row));
  statements.push(db.prepare(`
    INSERT OR IGNORE INTO organizations (id, name, expertise, operating_region)
    VALUES (1, 'JalSetu Foundation', 'Water,Pipeline Repair,Water Conservation', 'Delhi NCR')
  `));
  await db.batch(statements);
}

export async function GET() {
  try {
    const db = getD1();
    await seedDemoData();
    const [hotspotResult, complaintResult, statsResult] = await Promise.all([
      db.prepare(`SELECT id, area, category, issue, priority, report_count AS reports,
        growth, status, radius, position_left AS positionLeft, position_top AS positionTop,
        created_at AS createdAt, updated_at AS updatedAt
        FROM hotspots ORDER BY priority DESC, report_count DESC LIMIT 50`).all(),
      db.prepare(`SELECT id, tracking_code AS trackingCode, description, location, category,
        subcategory, severity, confidence, status, hotspot_id AS hotspotId,
        evidence_key AS evidenceKey, created_at AS createdAt
        FROM complaints ORDER BY created_at DESC, id DESC LIMIT 20`).all(),
      db.prepare(`SELECT
        COALESCE(SUM(report_count), 0) AS activeReports,
        COALESCE(SUM(CASE WHEN priority >= 7 THEN 1 ELSE 0 END), 0) AS emergingZones,
        COALESCE(SUM(CASE WHEN status = 'Under Investigation' THEN 1 ELSE 0 END), 0) AS underAction,
        COALESCE(SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END), 0) AS resolvedZones
        FROM hotspots`).first(),
    ]);

    return Response.json({
      hotspots: hotspotResult.results,
      complaints: complaintResult.results,
      stats: statsResult,
      updatedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load city intelligence";
    return Response.json({ error: message }, { status: 500 });
  }
}
