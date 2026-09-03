import { getD1 } from "@/db";
import { areaFromLocation, calculatePriority, classifyIssue, issueFor, positionFromText, trackingCode } from "@/lib/civic";
import { getCurrentAccount, unauthorized } from "@/lib/authz";
import { h3CellFor, resolveCoordinates } from "@/lib/geo";

type ComplaintPayload = {
  description?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  evidenceKey?: string | null;
};

export async function POST(request: Request) {
  try {
    const identity = await getCurrentAccount();
    if (!identity?.account) return unauthorized("Sign in as a citizen to report an issue.");

    const payload = await request.json() as ComplaintPayload;
    const description = payload.description?.trim() ?? "";
    const location = payload.location?.trim() ?? "";
    if (description.length < 12 || description.length > 1200) {
      return Response.json({ error: "Describe the issue in 12 to 1,200 characters." }, { status: 400 });
    }
    if (location.length < 3 || location.length > 160) {
      return Response.json({ error: "Enter a valid location." }, { status: 400 });
    }
    if (payload.evidenceKey && !/^[a-zA-Z0-9._/-]{1,220}$/.test(payload.evidenceKey)) {
      return Response.json({ error: "Invalid evidence reference." }, { status: 400 });
    }
    const coordinateProvided = payload.latitude !== undefined || payload.longitude !== undefined;
    if (coordinateProvided && (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)
      || Number(payload.latitude) < -90 || Number(payload.latitude) > 90
      || Number(payload.longitude) < -180 || Number(payload.longitude) > 180)) {
      return Response.json({ error: "The GPS coordinates are invalid. Capture your location again." }, { status: 400 });
    }

    const db = getD1();
    const analysis = classifyIssue(description);
    const area = areaFromLocation(location);
    const issue = issueFor(analysis.category, analysis.subcategory);
    const point = resolveCoordinates(location, payload.latitude, payload.longitude);
    const h3Cell = h3CellFor(point);
    const existing = await db.prepare(`SELECT id, report_count AS reports, growth, priority
      FROM hotspots WHERE category = ? AND (h3_cell = ? OR (h3_cell IS NULL AND area = ?))
      ORDER BY CASE WHEN h3_cell = ? THEN 0 ELSE 1 END LIMIT 1`)
      .bind(analysis.category, h3Cell, area, h3Cell)
      .first<{ id: number; reports: number; growth: number; priority: number }>();
    const nearby = await db.prepare(`SELECT COUNT(*) AS count FROM complaints
      WHERE category = ? AND (h3_cell = ? OR (h3_cell IS NULL AND LOWER(location) LIKE LOWER(?)))
      AND created_at >= datetime('now', '-7 days')`)
      .bind(analysis.category, h3Cell, `%${area}%`).first<{ count: number }>();

    let hotspotId: number;
    let reports: number;
    let growth: number;
    let priority: number;
    if (existing) {
      hotspotId = existing.id;
      reports = existing.reports + 1;
      growth = Math.min(999, existing.growth + Math.round(8 + analysis.severity));
      priority = calculatePriority(reports, analysis.severity, growth);
      await db.prepare(`UPDATE hotspots SET area = ?, issue = ?, report_count = ?, growth = ?, priority = ?,
        h3_cell = ?, latitude = ?, longitude = ?,
        updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .bind(area, issue, reports, growth, priority, h3Cell, point.latitude, point.longitude, hotspotId).run();
    } else {
      reports = 1;
      growth = 18;
      priority = calculatePriority(reports, analysis.severity, growth);
      const position = positionFromText(`${area}-${analysis.category}`);
      const inserted = await db.prepare(`INSERT INTO hotspots
        (area, category, issue, priority, report_count, growth, status, radius,
         position_left, position_top, h3_cell, latitude, longitude)
        VALUES (?, ?, ?, ?, ?, ?, 'Reported', '0.7 km', ?, ?, ?, ?, ?) RETURNING id`)
        .bind(area, analysis.category, issue, priority, reports, growth, position.left, position.top,
          h3Cell, point.latitude, point.longitude)
        .first<{ id: number }>();
      if (!inserted) throw new Error("Could not create the city zone.");
      hotspotId = inserted.id;
    }

    const code = trackingCode();
    await db.prepare(`INSERT INTO complaints
      (tracking_code, description, location, latitude, longitude, category, subcategory,
       severity, confidence, status, hotspot_id, reporter_auth_user_id, evidence_key, h3_cell)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Reported', ?, ?, ?, ?)`)
      .bind(code, description, location, point.latitude, point.longitude,
        analysis.category, analysis.subcategory, analysis.severity, analysis.confidence,
        hotspotId, identity.user.id, payload.evidenceKey ?? null, h3Cell).run();

    return Response.json({
      complaint: {
        trackingCode: code, description, location, status: "Reported", hotspotId,
        latitude: point.latitude, longitude: point.longitude, h3Cell, locationSource: point.source,
      },
      analysis: { ...analysis, similarReports: Number(nearby?.count ?? 0) },
      hotspot: {
        id: hotspotId, area, category: analysis.category, issue, priority, reports, growth,
        latitude: point.latitude, longitude: point.longitude, h3Cell,
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit the report";
    return Response.json({ error: message }, { status: 500 });
  }
}
