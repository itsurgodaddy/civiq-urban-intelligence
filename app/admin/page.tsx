import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requireChatGPTUser, chatGPTSignOutPath } from "@/app/chatgpt-auth";
import { getCurrentAccount } from "@/lib/authz";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { AdminDashboard } from "./admin-dashboard";
import { OwnerClaim } from "./owner-claim";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireChatGPTUser("/admin");
  const identity = await getCurrentAccount();
  if (!identity?.account) return null;

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6">
      <Toaster theme="dark" position="top-center" />
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3"><Button asChild variant="ghost"><Link href="/"><ArrowLeft /> Back to CIVIQ</Link></Button><div className="flex gap-2"><Button asChild variant="outline"><Link href="/account">My account</Link></Button><Button asChild variant="outline"><a href={chatGPTSignOutPath("/")} target="_top">Sign out</a></Button></div></div>
        {identity.account.role === "admin" ? <AdminDashboard /> : <OwnerClaim email={identity.account.email} />}
      </div>
    </main>
  );
}
