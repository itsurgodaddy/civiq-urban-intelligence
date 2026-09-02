import { getD1 } from "@/db";
import { forbidden, getCurrentAccount, unauthorized } from "@/lib/authz";

type ApplicationPayload = {
  name?: string;
  expertise?: string;
  operatingRegion?: string;
};

export async function POST(request: Request) {
  try {
    const identity = await getCurrentAccount();
    if (!identity?.account) return unauthorized("Sign in before applying as an organization.");
    if (identity.account.role === "admin") return forbidden("The owner account cannot be converted into an organization account.");

    const payload = await request.json() as ApplicationPayload;
    const name = payload.name?.trim() ?? "";
    const expertise = payload.expertise?.trim() ?? "";
    const operatingRegion = payload.operatingRegion?.trim() ?? "";
    if (name.length < 2 || name.length > 120) return Response.json({ error: "Enter an organization name." }, { status: 400 });
    if (expertise.length < 3 || expertise.length > 300) return Response.json({ error: "Describe your organization’s expertise." }, { status: 400 });
    if (operatingRegion.length < 2 || operatingRegion.length > 160) return Response.json({ error: "Enter an operating region." }, { status: 400 });

    const db = getD1();
    await db.prepare(`INSERT INTO organizations
      (name, expertise, operating_region, owner_auth_user_id, contact_email, verification_status, updated_at)
      VALUES (?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
      ON CONFLICT(owner_auth_user_id) DO UPDATE SET
        name = excluded.name,
        expertise = excluded.expertise,
        operating_region = excluded.operating_region,
        contact_email = excluded.contact_email,
        verification_status = 'pending',
        updated_at = CURRENT_TIMESTAMP`)
      .bind(name, expertise, operatingRegion, identity.user.id, identity.user.email).run();

    const organization = await db.prepare(`SELECT id, name, expertise,
        operating_region AS operatingRegion, verification_status AS status
      FROM organizations WHERE owner_auth_user_id = ? LIMIT 1`)
      .bind(identity.user.id).first<{ id: number; name: string; expertise: string; operatingRegion: string; status: string }>();
    if (!organization) throw new Error("Could not save the organization application.");

    await db.prepare(`UPDATE site_users SET role = 'organization_pending', organization_id = ?,
      updated_at = CURRENT_TIMESTAMP WHERE auth_user_id = ?`)
      .bind(organization.id, identity.user.id).run();

    return Response.json({ organization }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit the application";
    return Response.json({ error: message }, { status: 500 });
  }
}
