import { env } from "cloudflare:workers";
import { getD1 } from "@/db";
import { getCurrentAccount, unauthorized } from "@/lib/authz";

async function safeTokenMatch(received: string, expected: string) {
  const encoder = new TextEncoder();
  const [receivedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(received)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const left = new Uint8Array(receivedHash);
  const right = new Uint8Array(expectedHash);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export async function POST(request: Request) {
  try {
    const identity = await getCurrentAccount();
    if (!identity?.account) return unauthorized("Sign in before claiming the owner account.");
    if (identity.account.role === "admin") return Response.json({ claimed: true, alreadyOwner: true });

    const expectedToken = env.ADMIN_SETUP_TOKEN;
    if (!expectedToken) return Response.json({ error: "Owner setup is not configured." }, { status: 503 });
    const payload = await request.json() as { token?: string };
    if (!payload.token || !(await safeTokenMatch(payload.token, expectedToken))) {
      return Response.json({ error: "The owner setup key is incorrect." }, { status: 403 });
    }

    const db = getD1();
    const existingOwner = await db.prepare("SELECT auth_user_id AS authUserId FROM site_users WHERE role = 'admin' LIMIT 1")
      .first<{ authUserId: string }>();
    if (existingOwner && existingOwner.authUserId !== identity.user.id) {
      return Response.json({ error: "CIVIQ already has an owner account." }, { status: 409 });
    }

    await db.prepare(`UPDATE site_users SET role = 'admin', organization_id = NULL,
      updated_at = CURRENT_TIMESTAMP WHERE auth_user_id = ?`)
      .bind(identity.user.id).run();
    return Response.json({ claimed: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to claim owner access";
    return Response.json({ error: message }, { status: 500 });
  }
}
