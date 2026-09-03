import { getD1 } from "@/db";
import { forbidden, getCurrentAccount, unauthorized } from "@/lib/authz";

export async function GET() {
  try {
    const identity = await getCurrentAccount();
    if (!identity?.account) return unauthorized("Sign in to open the administrator dashboard.");
    if (identity.account.role !== "admin") return forbidden("Owner access is required.");

    const db = getD1();
    const [users, organizations, complaints, hotspots, stats] = await Promise.all([
      db.prepare(`SELECT id, email, display_name AS displayName, role,
        organization_id AS organizationId, created_at AS createdAt
        FROM site_users ORDER BY created_at DESC LIMIT 100`).all(),
      db.prepare(`SELECT id, name, expertise, operating_region AS operatingRegion,
        contact_email AS contactEmail, verification_status AS status,
        created_at AS createdAt FROM organizations
        ORDER BY CASE verification_status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC`).all(),
      db.prepare(`SELECT id, tracking_code AS trackingCode, description, location, category,
        severity, status, h3_cell AS h3Cell, latitude, longitude, created_at AS createdAt FROM complaints
        ORDER BY created_at DESC, id DESC LIMIT 50`).all(),
      db.prepare(`SELECT id, area, category, issue, priority, report_count AS reports,
        growth, status, h3_cell AS h3Cell, latitude, longitude, updated_at AS updatedAt FROM hotspots
        ORDER BY priority DESC, report_count DESC LIMIT 50`).all(),
      db.prepare(`SELECT
        (SELECT COUNT(*) FROM site_users) AS users,
        (SELECT COUNT(*) FROM organizations WHERE verification_status = 'pending') AS pendingOrganizations,
        (SELECT COUNT(*) FROM complaints) AS complaints,
        (SELECT COUNT(*) FROM hotspots WHERE status = 'Under Investigation') AS underInvestigation`).first(),
    ]);

    return Response.json({
      owner: { displayName: identity.account.displayName, email: identity.account.email },
      stats,
      users: users.results,
      organizations: organizations.results,
      complaints: complaints.results,
      hotspots: hotspots.results,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load administrator data";
    return Response.json({ error: message }, { status: 500 });
  }
}
