"use client";

import { useEffect, useState } from "react";
import { Activity, Building2, CheckCircle2, LoaderCircle, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { toast } from "sonner";

type AdminData = {
  owner: { displayName: string; email: string };
  stats: { users: number; pendingOrganizations: number; complaints: number; underInvestigation: number };
  users: Array<{ id: number; email: string; displayName: string; role: string; createdAt: string }>;
  organizations: Array<{ id: number; name: string; expertise: string; operatingRegion: string; contactEmail: string | null; status: string; createdAt: string }>;
  complaints: Array<{ id: number; trackingCode: string; description: string; location: string; category: string; severity: number; status: string; h3Cell: string | null; latitude: number | null; longitude: number | null; createdAt: string }>;
  hotspots: Array<{ id: number; area: string; category: string; issue: string; priority: number; reports: number; growth: number; status: string; h3Cell: string | null; latitude: number | null; longitude: number | null }>;
};

export function AdminDashboard() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load administrator data.");
      setData(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load administrator data.");
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  async function updateOrganization(id: number, status: string) {
    const response = await fetch(`/api/admin/organizations/${id}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    const result = await response.json();
    if (!response.ok) return toast.error(result.error || "Organization update failed.");
    toast.success(`Organization ${status}`);
    await load();
  }

  async function updateHotspot(id: number, status: string) {
    const response = await fetch(`/api/admin/hotspots/${id}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    const result = await response.json();
    if (!response.ok) return toast.error(result.error || "Hotspot update failed.");
    toast.success(`Zone marked ${status}`);
    await load();
  }

  if (loading && !data) return <div className="grid min-h-72 place-items-center text-muted-foreground"><LoaderCircle className="size-7 animate-spin text-primary" /></div>;
  if (!data) return null;

  const statCards = [
    ["Registered users", data.stats.users, Users],
    ["Pending organizations", data.stats.pendingOrganizations, Building2],
    ["Citizen reports", data.stats.complaints, Activity],
    ["Under investigation", data.stats.underInvestigation, CheckCircle2],
  ] as const;

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-3xl border bg-[linear-gradient(135deg,rgba(99,242,176,.13),rgba(13,26,24,.8))] p-7 soft-ring sm:flex-row sm:items-center">
        <div><div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-primary"><ShieldCheck className="size-4" /> Owner control center</div><h1 className="text-3xl font-black">Welcome, {data.owner.displayName}</h1><p className="mt-2 text-muted-foreground">Approve organizations, review reports, and control every issue status.</p></div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} /> Refresh</Button>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map(([label, value, Icon]) => <article key={label} className="rounded-2xl border bg-card/80 p-5 soft-ring"><Icon className="mb-5 size-5 text-primary" /><p className="text-2xl font-black">{value}</p><p className="mt-1 text-sm text-muted-foreground">{label}</p></article>)}
      </section>

      <section className="rounded-2xl border bg-card/80 p-5 soft-ring">
        <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Access control</p><h2 className="mt-1 text-xl font-bold">Organization approvals</h2></div>
        <div className="space-y-3">
          {data.organizations.filter((organization) => organization.contactEmail).length === 0 && <p className="rounded-xl bg-secondary/50 p-4 text-sm text-muted-foreground">No organization applications yet.</p>}
          {data.organizations.filter((organization) => organization.contactEmail).map((organization) => (
            <article key={organization.id} className="grid gap-4 rounded-xl border p-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{organization.name}</h3><Badge variant="outline">{organization.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{organization.contactEmail} · {organization.operatingRegion}</p><p className="mt-2 text-sm text-slate-300">{organization.expertise}</p></div>
              <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => void updateOrganization(organization.id, "rejected")}>Reject</Button><Button size="sm" onClick={() => void updateOrganization(organization.id, "verified")}>Approve</Button></div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-card/80 p-5 soft-ring">
        <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Operations</p><h2 className="mt-1 text-xl font-bold">City zones</h2></div>
        <div className="space-y-3">
          {data.hotspots.map((hotspot) => (
            <article key={hotspot.id} className="grid gap-4 rounded-xl border p-4 lg:grid-cols-[1fr_220px] lg:items-center">
              <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{hotspot.area} · {hotspot.issue}</h3><Badge variant="secondary">{hotspot.priority}/10</Badge></div><p className="mt-1 text-sm text-muted-foreground">{hotspot.category} · {hotspot.reports} reports · +{hotspot.growth}%</p>{hotspot.h3Cell && <p className="mt-2 font-mono text-[11px] text-primary">H3 · {hotspot.h3Cell}</p>}</div>
              <NativeSelect value={hotspot.status} onChange={(event) => void updateHotspot(hotspot.id, event.target.value)} aria-label={`Status for ${hotspot.area}`}>
                {["Reported", "Under Investigation", "Solution Proposed", "Resolved"].map((status) => <NativeSelectOption key={status} value={status}>{status}</NativeSelectOption>)}
              </NativeSelect>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border bg-card/80 p-5 soft-ring"><h2 className="text-xl font-bold">Recent users</h2><div className="mt-4 space-y-2">{data.users.slice(0, 8).map((user) => <div key={user.id} className="flex items-center justify-between gap-3 rounded-xl bg-secondary/45 p-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{user.displayName}</p><p className="truncate text-xs text-muted-foreground">{user.email}</p></div><Badge variant="outline">{user.role}</Badge></div>)}</div></article>
        <article className="rounded-2xl border bg-card/80 p-5 soft-ring"><h2 className="text-xl font-bold">Recent complaints</h2><div className="mt-4 space-y-2">{data.complaints.slice(0, 8).map((complaint) => <div key={complaint.id} className="rounded-xl bg-secondary/45 p-3"><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold">{complaint.description}</p><Badge variant="outline">{complaint.status}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{complaint.trackingCode} · {complaint.location}</p></div>)}</div></article>
      </section>
    </div>
  );
}
