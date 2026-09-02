import { ArrowLeft, Building2, CheckCircle2, Clock3, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { requireChatGPTUser, chatGPTSignOutPath } from "@/app/chatgpt-auth";
import { getCurrentAccount } from "@/lib/authz";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { OrganizationApplication } from "./organization-application";

export const dynamic = "force-dynamic";

const roleDetails = {
  citizen: { label: "Citizen", description: "You can submit and track your own civic reports.", icon: UserRound },
  organization_pending: { label: "Organization pending", description: "Your organization application is waiting for owner review.", icon: Clock3 },
  organization: { label: "Verified organization", description: "You can investigate and adopt relevant city issues.", icon: Building2 },
  admin: { label: "Site owner", description: "You control users, organization approvals, and issue status.", icon: ShieldCheck },
} as const;

export default async function AccountPage() {
  await requireChatGPTUser("/account");
  const identity = await getCurrentAccount();
  if (!identity?.account) return null;
  const details = roleDetails[identity.account.role];
  const RoleIcon = details.icon;

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6">
      <Toaster theme="dark" position="top-center" />
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost"><Link href="/"><ArrowLeft /> Back to CIVIQ</Link></Button>
          <Button asChild variant="outline"><a href={chatGPTSignOutPath("/")} target="_top">Sign out</a></Button>
        </div>

        <section className="mb-6 rounded-3xl border bg-[linear-gradient(135deg,rgba(99,242,176,.12),rgba(13,26,24,.8))] p-7 soft-ring sm:p-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"><RoleIcon className="size-7" /></span>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2"><Badge className="bg-primary/15 text-primary">{details.label}</Badge>{identity.account.organizationStatus === "verified" && <Badge variant="outline"><CheckCircle2 /> Verified</Badge>}</div>
              <h1 className="truncate text-3xl font-black">{identity.account.displayName}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{identity.account.email}</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">{details.description}</p>
            </div>
            {identity.account.role === "admin" && <Button asChild><a href="/admin"><ShieldCheck /> Open admin</a></Button>}
          </div>
        </section>

        {identity.account.organizationName && (
          <section className="mb-6 rounded-2xl border bg-card/80 p-6 soft-ring">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Organization</p>
            <h2 className="mt-2 text-xl font-bold">{identity.account.organizationName}</h2>
            <p className="mt-2 text-sm text-muted-foreground">Verification: {identity.account.organizationStatus}</p>
          </section>
        )}

        {(identity.account.role === "citizen" || identity.account.role === "organization_pending") && (
          <OrganizationApplication pending={identity.account.role === "organization_pending"} />
        )}
      </div>
    </main>
  );
}
