import { getD1 } from "@/db";
import { getCurrentAccount } from "@/lib/authz";
import { h3CellFor } from "@/lib/geo";

const seedHotspots = [
  { id: 1, area: "Sector 17", category: "Water", issue: "Probable pipeline leakage", priority: 8.7, reports: 37, growth: 270, status: "Reported", radius: "1.3 km", positionLeft: 50, positionTop: 42, latitude: 28.7407, longitude: 77.1136 },
  { id: 2, area: "Sector 24", category: "Roads", issue: "Recurring road damage", priority: 7.1, reports: 22, growth: 84, status: "Reported", radius: "0.8 km", positionLeft: 69, positionTop: 58, latitude: 28.7242, longitude: 77.0895 },
  { id: 3, area: "Model Town", category: "Waste", issue: "Uncollected solid waste", priority: 6.4, reports: 19, growth: 41, status: "Reported", radius: "0.6 km", positionLeft: 30, positionTop: 62, latitude: 28.7029, longitude: 77.1912 },
  { id: 4, area: "Rithala", category: "Electricity", issue: "Streetlight outage cluster", priority: 4.9, reports: 11, growth: 18, status: "Reported", radius: "0.4 km", positionLeft: 62, positionTop: 24, latitude: 28.7208, longitude: 77.107 },
  { id: 5, area: "Sector 11", category: "Water", issue: "Low water pressure", priority: 4.3, reports: 8, growth: 12, status: "Reported", radius: "0.3 km", positionLeft: 35, positionTop: 30, latitude: 28.7312, longitude: 77.1212 },
] as const;

async function seedDemoData() {
  const db = getD1();
  const statements = seedHotspots.flatMap((row) => {
    const h3Cell = h3CellFor(row);
    return [
      db.prepare(`INSERT OR IGNORE INTO hotspots
        (id, area, category, issue, priority, report_count, growth, status, radius,
         position_left, position_top, h3_cell, latitude, longitude)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(row.id, row.area, row.category, row.issue, row.priority, row.reports, row.growth,
          row.status, row.radius, row.positionLeft, row.positionTop, h3Cell, row.latitude, row.longitude),
      db.prepare(`UPDATE hotspots SET h3_cell = ?, latitude = ?, longitude = ?
        WHERE id = ? AND (h3_cell IS NULL OR latitude IS NULL OR longitude IS NULL)`)
        .bind(h3Cell, row.latitude, row.longitude, row.id),
    ];
  });
  statements.push(db.prepare(`
    INSERT OR IGNORE INTO organizations (id, name, expertise, operating_region)
    VALUES (1, 'JalSetu Foundation', 'Water,Pipeline Repair,Water Conservation', 'Delhi NCR')
  `));
  statements.push(db.prepare(`UPDATE organizations SET verification_status = 'verified'
    WHERE id = 1 AND owner_auth_user_id IS NULL`));
  await db.batch(statements);
}

export async function GET() {
  try {
    const db = getD1();
    const identity = await getCurrentAccount();
    await seedDemoData();
    const [hotspotResult, complaintResult, statsResult] = await Promise.all([
      db.prepare(`SELECT id, area, category, issue, priority, report_count AS reports,
        growth, status, radius, h3_cell AS h3Cell, latitude, longitude,
        position_left AS positionLeft, position_top AS positionTop,
        created_at AS createdAt, updated_at AS updatedAt
        FROM hotspots ORDER BY priority DESC, report_count DESC LIMIT 50`).all(),
      db.prepare(`SELECT id, tracking_code AS trackingCode, description, location, category,
        subcategory, severity, confidence, status, hotspot_id AS hotspotId,
        h3_cell AS h3Cell, latitude, longitude, evidence_key AS evidenceKey, created_at AS createdAt
        FROM complaints WHERE reporter_auth_user_id = ?
        ORDER BY created_at DESC, id DESC LIMIT 20`)
        .bind(identity?.user.id ?? "__anonymous__").all(),
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
      viewer: identity?.account ? {
        displayName: identity.account.displayName,
        email: identity.account.email,
        role: identity.account.role,
        organizationId: identity.account.organizationId,
        organizationName: identity.account.organizationName,
        organizationStatus: identity.account.organizationStatus,
      } : null,
      stats: statsResult,
      updatedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load city intelligence";
    return Response.json({ error: message }, { status: 500 });
  }
}
