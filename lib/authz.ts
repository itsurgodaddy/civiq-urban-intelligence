import { getChatGPTUser, type ChatGPTUser } from "@/app/chatgpt-auth";
import { getD1 } from "@/db";

export type AppRole = "citizen" | "organization_pending" | "organization" | "admin";

export type AppAccount = {
  id: number;
  authUserId: string;
  email: string;
  displayName: string;
  role: AppRole;
  organizationId: number | null;
  organizationName: string | null;
  organizationStatus: string | null;
};

type AccountRow = {
  id: number;
  authUserId: string;
  email: string;
  displayName: string;
  role: AppRole;
  organizationId: number | null;
  organizationName: string | null;
  organizationStatus: string | null;
};

export async function getCurrentAccount(options: { create?: boolean } = {}): Promise<{ user: ChatGPTUser; account: AppAccount | null } | null> {
  const user = await getChatGPTUser();
  if (!user) return null;

  const db = getD1();
  let account = await findAccount(user.id);
  if (!account && options.create !== false) {
    await db.prepare(`INSERT OR IGNORE INTO site_users
      (auth_user_id, email, display_name, role)
      VALUES (?, ?, ?, 'citizen')`)
      .bind(user.id, user.email, user.displayName).run();
    account = await findAccount(user.id);
  } else if (account && (account.email !== user.email || account.displayName !== user.displayName)) {
    await db.prepare(`UPDATE site_users SET email = ?, display_name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE auth_user_id = ?`)
      .bind(user.email, user.displayName, user.id).run();
    account = { ...account, email: user.email, displayName: user.displayName };
  }

  return { user, account };
}

export async function findAccount(authUserId: string): Promise<AppAccount | null> {
  const db = getD1();
  return db.prepare(`SELECT u.id, u.auth_user_id AS authUserId, u.email,
      u.display_name AS displayName, u.role, u.organization_id AS organizationId,
      o.name AS organizationName, o.verification_status AS organizationStatus
    FROM site_users u
    LEFT JOIN organizations o ON o.id = u.organization_id
    WHERE u.auth_user_id = ? LIMIT 1`)
    .bind(authUserId).first<AccountRow>();
}

export function unauthorized(message = "Sign in with ChatGPT to continue.") {
  return Response.json({ error: message, code: "AUTH_REQUIRED" }, { status: 401 });
}

export function forbidden(message = "You do not have permission to perform this action.") {
  return Response.json({ error: message, code: "FORBIDDEN" }, { status: 403 });
}
