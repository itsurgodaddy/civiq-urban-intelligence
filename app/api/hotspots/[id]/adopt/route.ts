import { getD1 } from "@/db";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id < 1) return Response.json({ error: "Invalid hotspot." }, { status: 400 });
    const db = getD1();
    const hotspot = await db.prepare("SELECT id FROM hotspots WHERE id = ?").bind(id).first();
    if (!hotspot) return Response.json({ error: "Hotspot not found." }, { status: 404 });

    await db.batch([
      db.prepare("UPDATE hotspots SET status = 'Under Investigation', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id),
      db.prepare("UPDATE complaints SET status = 'Under Investigation' WHERE hotspot_id = ?").bind(id),
      db.prepare(`INSERT INTO adoptions (organization_id, hotspot_id, status)
        VALUES (1, ?, 'Under Investigation')
        ON CONFLICT(hotspot_id) DO UPDATE SET status = 'Under Investigation'`).bind(id),
    ]);
    return Response.json({ hotspotId: id, status: "Under Investigation", organization: "JalSetu Foundation" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to adopt this issue";
    return Response.json({ error: message }, { status: 500 });
  }
}
