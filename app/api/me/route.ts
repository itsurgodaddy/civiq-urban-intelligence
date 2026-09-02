import { getCurrentAccount } from "@/lib/authz";

export async function GET() {
  const identity = await getCurrentAccount();
  if (!identity?.account) {
    return Response.json({ authenticated: false }, { headers: { "Cache-Control": "no-store" } });
  }

  return Response.json({
    authenticated: true,
    user: {
      displayName: identity.account.displayName,
      email: identity.account.email,
      role: identity.account.role,
      organizationId: identity.account.organizationId,
      organizationName: identity.account.organizationName,
      organizationStatus: identity.account.organizationStatus,
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
