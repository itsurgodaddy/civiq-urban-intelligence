import { getD1 } from "@/db";
import { forbidden, getCurrentAccount, unauthorized } from "@/lib/authz";

const allowedStatuses = new Set(["verified", "rejected", "pending"]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const identity = await getCurrentAccount();
    if (!identity?.account) return unauthorized();
    if (identity.account.role !== "admin") return forbidden("Owner access is required.");

    const { id: rawId } = await context.params;
    const id = Number(rawId);
    const payload = await request.json() as { status?: string };
    if (!Number.isInteger(id) || id < 1 || !payload.status || !allowedStatuses.has(payload.status)) {
      return Response.json({ error: "Invalid organization update." }, { status: 400 });
    }

    const db = getD1();
    const organization = await db.prepare("SELECT owner_auth_user_id AS ownerAuthUserId FROM organizations WHERE id = ?")
      .bind(id).first<{ ownerAuthUserId: string | null }>();
    if (!organization) return Response.json({ error: "Organization not found." }, { status: 404 });
    if (!organization.ownerAuthUserId) return Response.json({ error: "The demo organization cannot be reassigned." }, { status: 409 });

    const nextRole = payload.status === "verified" ? "organization" : payload.status === "pending" ? "organization_pending" : "citizen";
    await db.batch([
      db.prepare("UPDATE organizations SET verification_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(payload.status, id),
      db.prepare("UPDATE site_users SET role = ?, organization_id = ?, updated_at = CURRENT_TIMESTAMP WHERE auth_user_id = ?")
        .bind(nextRole, payload.status === "rejected" ? null : id, organization.ownerAuthUserId),
    ]);
    return Response.json({ id, status: payload.status, role: nextRole });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update the organization";
    return Response.json({ error: message }, { status: 500 });
  }
}
