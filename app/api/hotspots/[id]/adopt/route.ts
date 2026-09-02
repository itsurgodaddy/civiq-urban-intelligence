import { getD1 } from "@/db";
import { forbidden, getCurrentAccount, unauthorized } from "@/lib/authz";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const identity = await getCurrentAccount();
    if (!identity?.account) return unauthorized("Sign in with an approved organization account to investigate issues.");
    if (!['organization', 'admin'].includes(identity.account.role)) {
      return forbidden(identity.account.role === 'organization_pending'
        ? "Your organization is awaiting administrator approval."
        : "Only approved organizations can investigate an issue.");
    }

    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id < 1) return Response.json({ error: "Invalid hotspot." }, { status: 400 });
    const db = getD1();
    const hotspot = await db.prepare("SELECT id FROM hotspots WHERE id = ?").bind(id).first();
    if (!hotspot) return Response.json({ error: "Hotspot not found." }, { status: 404 });

    const organizationId = identity.account.organizationId ?? 1;
    const organization = await db.prepare("SELECT name, verification_status AS status FROM organizations WHERE id = ?")
      .bind(organizationId).first<{ name: string; status: string }>();
    if (!organization || (identity.account.role !== 'admin' && organization.status !== 'verified')) {
      return forbidden("Your organization must be verified before it can investigate issues.");
    }

    await db.batch([
      db.prepare("UPDATE hotspots SET status = 'Under Investigation', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id),
      db.prepare("UPDATE complaints SET status = 'Under Investigation' WHERE hotspot_id = ?").bind(id),
      db.prepare(`INSERT INTO adoptions (organization_id, hotspot_id, status)
        VALUES (?, ?, 'Under Investigation')
        ON CONFLICT(hotspot_id) DO UPDATE SET organization_id = excluded.organization_id,
          status = 'Under Investigation', adopted_by_auth_user_id = ?`)
        .bind(organizationId, id, identity.user.id),
      db.prepare("UPDATE adoptions SET adopted_by_auth_user_id = ? WHERE hotspot_id = ?")
        .bind(identity.user.id, id),
    ]);
    return Response.json({ hotspotId: id, status: "Under Investigation", organization: organization.name });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to adopt this issue";
    return Response.json({ error: message }, { status: 500 });
  }
}
