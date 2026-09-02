import { getD1 } from "@/db";
import { forbidden, getCurrentAccount, unauthorized } from "@/lib/authz";

const allowedStatuses = new Set(["Reported", "Under Investigation", "Solution Proposed", "Resolved"]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const identity = await getCurrentAccount();
    if (!identity?.account) return unauthorized();
    if (identity.account.role !== "admin") return forbidden("Owner access is required.");

    const { id: rawId } = await context.params;
    const id = Number(rawId);
    const payload = await request.json() as { status?: string };
    if (!Number.isInteger(id) || id < 1 || !payload.status || !allowedStatuses.has(payload.status)) {
      return Response.json({ error: "Invalid hotspot update." }, { status: 400 });
    }

    const db = getD1();
    await db.batch([
      db.prepare("UPDATE hotspots SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(payload.status, id),
      db.prepare("UPDATE complaints SET status = ? WHERE hotspot_id = ?").bind(payload.status, id),
      db.prepare("UPDATE adoptions SET status = ? WHERE hotspot_id = ?").bind(payload.status, id),
    ]);
    return Response.json({ id, status: payload.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update the hotspot";
    return Response.json({ error: message }, { status: 500 });
  }
}
