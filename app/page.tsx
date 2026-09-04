"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowUpRight, Building2, CheckCircle2,
  CircleDot, Clock3, Droplets, Gauge, ImagePlus,
  Layers3, Lightbulb, LocateFixed, Map as MapIcon, Navigation,
  LogIn, Plus, Radio, Route, Search, Send, ShieldCheck, Sparkles,
  Trash2, UserRound, Waves, Wrench, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter,
  SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { IntelligenceMap } from "@/components/intelligence-map";

type Layer = "All" | "Water" | "Roads" | "Waste" | "Electricity";
type Hotspot = {
  id: number | string; area: string; category: Exclude<Layer, "All">; issue: string;
  priority: number; reports: number; growth: number; since: string;
  radius: string; status?: string; latitude: number; longitude: number; h3Cell: string;
};

type AggregatedHotspot = Hotspot & {
  isCluster?: boolean;
  containedHotspots?: Hotspot[];
};

type Complaint = {
  id: number; trackingCode: string; description: string; location: string;
  category: string; subcategory: string; severity: number; confidence: number;
  status: string; hotspotId: number; evidenceKey?: string | null; createdAt: string;
  latitude?: number | null; longitude?: number | null; h3Cell?: string | null;
};

type Submission = {
  complaint: { trackingCode: string; description: string; location: string; status: string; hotspotId: number; latitude: number; longitude: number; h3Cell: string; locationSource: string };
  analysis: { category: string; subcategory: string; severity: number; confidence: number; similarReports: number };
  hotspot: { id: number; area: string; category: string; issue: string; priority: number; reports: number; growth: number; latitude: number; longitude: number; h3Cell: string };
};

type Viewer = {
  displayName: string;
  email: string;
  role: "citizen" | "organization_pending" | "organization" | "admin";
  organizationId: number | null;
  organizationName: string | null;
  organizationStatus: string | null;
};

const fallbackHotspots: Hotspot[] = [
  { id: 1, area: "Sector 17", category: "Water", issue: "Probable pipeline leakage", priority: 8.7, reports: 37, growth: 270, since: "3 days", radius: "1.3 km", latitude: 28.7407, longitude: 77.1136, h3Cell: "883da18ea3fffff" },
  { id: 2, area: "Sector 24", category: "Roads", issue: "Recurring road damage", priority: 7.1, reports: 22, growth: 84, since: "8 days", radius: "0.8 km", latitude: 28.7242, longitude: 77.0895, h3Cell: "883da18c1dfffff" },
  { id: 3, area: "Model Town", category: "Waste", issue: "Uncollected solid waste", priority: 6.4, reports: 19, growth: 41, since: "5 days", radius: "0.6 km", latitude: 28.7029, longitude: 77.1912, h3Cell: "883da1165bfffff" },
  { id: 4, area: "Rithala", category: "Electricity", issue: "Streetlight outage cluster", priority: 4.9, reports: 11, growth: 18, since: "2 days", radius: "0.4 km", latitude: 28.7208, longitude: 77.107, h3Cell: "883da18c13fffff" },
  { id: 5, area: "Sector 11", category: "Water", issue: "Low water pressure", priority: 4.3, reports: 8, growth: 12, since: "2 days", radius: "0.3 km", latitude: 28.7312, longitude: 77.1212, h3Cell: "883da18cc1fffff" },
];

const layerConfig = {
  Water: { color: "#52b9ff", soft: "rgba(82,185,255,.18)", icon: Droplets },
  Roads: { color: "#ff7a70", soft: "rgba(255,122,112,.18)", icon: Route },
  Waste: { color: "#63f2b0", soft: "rgba(99,242,176,.18)", icon: Trash2 },
  Electricity: { color: "#ffbd59", soft: "rgba(255,189,89,.18)", icon: Zap },
};

const zoneTrend = [12, 16, 15, 23, 29, 37, 51, 72];

function StatCard({ label, value, change, icon: Icon }: { label: string; value: string; change: string; icon: typeof Activity }) {
  return (
    <article className="rounded-2xl border bg-card/80 p-4 soft-ring">
      <div className="mb-4 flex items-center justify-between text-muted-foreground">
        <span className="text-sm">{label}</span>
        <Icon className="size-4" />
      </div>
      <div className="flex items-end justify-between gap-3">
        <strong className="text-2xl tracking-tight">{value}</strong>
        <span className="text-xs font-semibold text-primary">{change}</span>
      </div>
    </article>
  );
}

function PriorityBadge({ value }: { value: number }) {
  const tone = value >= 8 ? "border-red-400/30 bg-red-400/10 text-red-300" : value >= 6 ? "border-amber-300/30 bg-amber-300/10 text-amber-200" : "border-sky-300/30 bg-sky-300/10 text-sky-200";
  return <Badge variant="outline" className={`${tone} font-mono`}>{value.toFixed(1)} priority</Badge>;
}

function TrendBars() {
  const max = Math.max(...zoneTrend);
  return (
    <div className="flex h-20 items-end gap-1.5" aria-label="Complaint growth trend">
      {zoneTrend.map((v, i) => (
        <div key={i} className="flex-1 rounded-t-sm bg-primary/20 transition-colors hover:bg-primary" style={{ height: `${(v / max) * 100}%` }} title={`${v} reports`} />
      ))}
    </div>
  );
}

function ReportAction({ signedIn, onOpen, className = "", compact = false }: { signedIn: boolean; onOpen: () => void; className?: string; compact?: boolean }) {
  if (!signedIn) {
    return <Button asChild className={className}><a href="/signin-with-chatgpt?return_to=%2F" target="_top"><LogIn className="size-4" /> {compact ? "Sign in" : "Sign in to report"}</a></Button>;
  }
  return <Button onClick={onOpen} className={className}><Plus className="size-4" /> {compact ? "Report" : "Report issue"}</Button>;
}

export default function Home() {
  const [layer, setLayer] = useState<Layer>("All");
  const [selected, setSelected] = useState<AggregatedHotspot | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [adopted, setAdopted] = useState<number[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>(fallbackHotspots);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [stats, setStats] = useState({ activeReports: 97, emergingZones: 2, underAction: 0, resolvedZones: 0 });
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [reportCoordinates, setReportCoordinates] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orgSearch, setOrgSearch] = useState("");
  const [viewer, setViewer] = useState<Viewer | null | undefined>(undefined);
  const visibleHotspots = useMemo(() => hotspots.filter((hotspot) => layer === "All" || hotspot.category === layer), [hotspots, layer]);
  const leadHotspot = visibleHotspots[0] ?? hotspots[0] ?? fallbackHotspots[0];
  const canInvestigate = viewer?.role === "organization" || viewer?.role === "admin";

  async function loadDashboard() {
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      if (!response.ok) throw new Error("City data is temporarily unavailable.");
      const data = await response.json();
      const liveHotspots = (data.hotspots as Array<Record<string, unknown>>).map((item) => {
        const fallback = fallbackHotspots.find((hotspot) => hotspot.id === Number(item.id)) ?? fallbackHotspots[0];
        const latitude = Number(item.latitude);
        const longitude = Number(item.longitude);
        return {
          id: Number(item.id), area: String(item.area), category: String(item.category) as Hotspot["category"],
          issue: String(item.issue), priority: Number(item.priority), reports: Number(item.reports),
          growth: Number(item.growth), radius: String(item.radius), status: String(item.status),
          since: "Live",
          latitude: Number.isFinite(latitude) ? latitude : fallback.latitude,
          longitude: Number.isFinite(longitude) ? longitude : fallback.longitude,
          h3Cell: typeof item.h3Cell === "string" && item.h3Cell ? item.h3Cell : fallback.h3Cell,
        };
      });
      if (liveHotspots.length) setHotspots(liveHotspots);
      setComplaints(data.complaints ?? []);
      setViewer(data.viewer ?? null);
      if (data.stats) setStats({
        activeReports: Number(data.stats.activeReports ?? 0),
        emergingZones: Number(data.stats.emergingZones ?? 0),
        underAction: Number(data.stats.underAction ?? 0),
        resolvedZones: Number(data.stats.resolvedZones ?? 0),
      });
      setAdopted(liveHotspots.filter((h) => h.status === "Under Investigation").map((h) => h.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to refresh city data");
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { 
    // TODO: REMOVE MOCK DATA - DEV ONLY
    // Bypassing API to test 3D multi-category rings
    const mockData: Hotspot[] = [
      // Cluster 1 (Sector 17) - Multi-category stack (Water, Roads, Waste, Electricity)
      { id: "mock-1", area: "Sector 17 Zone A", category: "Water", issue: "Pipeline Leak", priority: 8.5, reports: 12, growth: 10, since: "1 day", radius: "1 km", latitude: 28.7407, longitude: 77.1136, h3Cell: "883da18ea3fffff" },
      { id: "mock-2", area: "Sector 17 Zone B", category: "Roads", issue: "Potholes", priority: 7.2, reports: 8, growth: 5, since: "3 days", radius: "1 km", latitude: 28.7408, longitude: 77.1137, h3Cell: "883da18ea3fffff" },
      { id: "mock-3", area: "Sector 17 Zone C", category: "Waste", issue: "Garbage Dump", priority: 6.8, reports: 15, growth: 20, since: "5 days", radius: "1 km", latitude: 28.7406, longitude: 77.1135, h3Cell: "883da18ea3fffff" },
      { id: "mock-4", area: "Sector 17 Zone D", category: "Electricity", issue: "Power Outage", priority: 9.1, reports: 30, growth: 50, since: "Live", radius: "2 km", latitude: 28.7407, longitude: 77.1136, h3Cell: "883da18ea3fffff" },
      
      // Cluster 2 (Sector 24) - Multi-category stack (Roads, Water)
      { id: "mock-5", area: "Sector 24 North", category: "Roads", issue: "Broken Traffic Light", priority: 8.0, reports: 5, growth: 2, since: "12 hours", radius: "0.5 km", latitude: 28.7242, longitude: 77.0895, h3Cell: "883da18c1dfffff" },
      { id: "mock-6", area: "Sector 24 South", category: "Water", issue: "Drainage Overflow", priority: 7.5, reports: 14, growth: 15, since: "2 days", radius: "0.8 km", latitude: 28.7243, longitude: 77.0896, h3Cell: "883da18c1dfffff" },

      // Normal single
      { id: "mock-7", area: "Model Town", category: "Waste", issue: "Uncollected solid waste", priority: 6.4, reports: 19, growth: 41, since: "5 days", radius: "0.6 km", latitude: 28.7029, longitude: 77.1912, h3Cell: "883da1165bfffff" },
    ];
    setHotspots(mockData);
    setViewer({
      displayName: "Mock Admin",
      email: "mock@example.com",
      role: "admin",
      organizationId: 1,
      organizationName: "Civic Authority",
      organizationStatus: "active"
    });
  }, []);

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const form = new FormData(event.currentTarget);
      let evidenceKey: string | null = null;
      if (evidenceFile) {
        const evidence = new FormData();
        evidence.append("file", evidenceFile);
        const uploadResponse = await fetch("/api/evidence", { method: "POST", body: evidence });
        const upload = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(upload.error || "Evidence upload failed.");
        evidenceKey = upload.key;
      }
      const response = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: form.get("description"),
          location: form.get("location"),
          latitude: reportCoordinates?.latitude,
          longitude: reportCoordinates?.longitude,
          evidenceKey,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The report could not be submitted.");
      setSubmission(data);
      setSubmitted(true);
      await loadDashboard();
    } catch (error) {
      toast.error("Report not submitted", { description: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  async function adoptIssue(id: number) {
    try {
      const response = await fetch(`/api/hotspots/${id}/adopt`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to investigate this issue.");
      setAdopted((current) => current.includes(id) ? current : [...current, id]);
      toast.success("Issue moved to investigation", { description: "Citizens can now see the updated response status." });
      setSelected(null);
      await loadDashboard();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update the issue");
    }
  }

  function captureReportLocation() {
    if (!navigator.geolocation) {
      toast.error("GPS is not available in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setReportCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLocating(false);
        toast.success("GPS location attached", { description: `Accurate to about ${Math.round(position.coords.accuracy)} metres.` });
      },
      (error) => {
        setLocating(false);
        toast.error("Location was not attached", { description: error.message || "Allow location access and try again." });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  }

  function resetDialog(open: boolean) {
    setReportOpen(open);
    if (!open) window.setTimeout(() => { setSubmitted(false); setSubmission(null); setEvidenceFile(null); setReportCoordinates(null); setLocating(false); }, 250);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Toaster theme="dark" position="top-center" />
      <div className="border-b bg-[#081310]/95 px-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex min-h-16 max-w-[1540px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_24px_rgba(99,242,176,.25)]">
              <Layers3 className="size-5" />
            </div>
            <div>
              <p className="text-base font-black tracking-[.13em]">CIVIQ</p>
              <p className="hidden text-xs text-muted-foreground sm:block">Urban Intelligence Layer</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border px-3 py-2 text-xs text-muted-foreground md:flex">
              <LocateFixed className="size-3.5 text-primary" /> Delhi · Live
            </div>
            <ReportAction signedIn={!!viewer} onOpen={() => resetDialog(true)} compact className="rounded-full px-4 font-bold sm:hidden" />
            <ReportAction signedIn={!!viewer} onOpen={() => resetDialog(true)} className="hidden rounded-full px-4 font-bold sm:inline-flex" />
            {viewer ? <Button asChild variant="outline" className="hidden rounded-full md:inline-flex"><a href="/account"><UserRound /> {viewer.role === "admin" ? "Owner" : "Account"}</a></Button> : <Badge variant="secondary" className="hidden rounded-full px-3 py-2 sm:inline-flex">Public beta</Badge>}
            {viewer?.role === "admin" && <Button asChild variant="secondary" className="hidden rounded-full lg:inline-flex"><a href="/admin"><ShieldCheck /> Admin</a></Button>}
          </div>
        </div>
      </div>

      <Tabs defaultValue="intelligence" className="mx-auto max-w-[1540px] gap-0">
        <div className="border-b px-4 sm:px-6">
          <TabsList variant="line" className="h-12 w-full justify-start gap-5 overflow-x-auto bg-transparent p-0 sm:w-auto">
            <TabsTrigger value="intelligence" className="h-full px-1 text-sm"><MapIcon /> Intelligence map</TabsTrigger>
            <TabsTrigger value="citizen" className="h-full px-1 text-sm"><UserRound /> Citizen view</TabsTrigger>
            <TabsTrigger value="organizations" className="h-full px-1 text-sm"><Building2 /> Organizations</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="intelligence" className="p-4 sm:p-6">
          <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-primary">
                <span className="size-1.5 rounded-full bg-primary" /> City status · 09:42
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Delhi is speaking.</h1>
              <p className="mt-2 max-w-2xl text-base text-muted-foreground">Citizen reports are being clustered into live, explainable problem zones.</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(["All", "Water", "Roads", "Waste", "Electricity"] as Layer[]).map((item) => (
                <Button key={item} size="sm" variant={layer === item ? "default" : "outline"} onClick={() => setLayer(item)} className="rounded-full">
                  {item}
                </Button>
              ))}
            </div>
          </div>

          <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Clustered reports" value={stats.activeReports.toLocaleString()} change="live" icon={Activity} />
            <StatCard label="Emerging zones" value={String(stats.emergingZones).padStart(2, "0")} change="priority ≥ 7" icon={Radio} />
            <StatCard label="Zones under action" value={String(stats.underAction).padStart(2, "0")} change="organizations active" icon={Wrench} />
            <StatCard label="Resolved zones" value={String(stats.resolvedZones).padStart(2, "0")} change="tracked publicly" icon={CheckCircle2} />
          </section>

          <section className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_310px]">
            <aside className="order-2 rounded-2xl border bg-card/70 p-4 soft-ring xl:order-1">
              <div className="mb-4 flex items-center justify-between">
                <div><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Hotspots</p><h2 className="mt-1 text-lg font-bold">Needs attention</h2></div>
                <Badge variant="secondary">{visibleHotspots.length} live</Badge>
              </div>
              <div className="space-y-2">
                {visibleHotspots.slice(0, 4).map((h, index) => {
                  const Icon = layerConfig[h.category].icon;
                  return (
                    <button key={h.id} onClick={() => setSelected(h)} className="group flex w-full items-center gap-3 rounded-xl border border-transparent p-3 text-left transition hover:border-border hover:bg-secondary/80">
                      <span className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ background: layerConfig[h.category].soft, color: layerConfig[h.category].color }}><Icon className="size-4" /></span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{h.area}</span><span className="block truncate text-xs text-muted-foreground">{h.issue}</span></span>
                      <span className="font-mono text-sm font-bold">{h.priority}</span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <div className="order-1 xl:order-2"><IntelligenceMap hotspots={visibleHotspots} selectedId={selected?.id} onSelect={(hotspot) => setSelected(hotspot as AggregatedHotspot)} /></div>

            <aside className="order-3 space-y-4">
              <article className="rounded-2xl border border-red-400/20 bg-[linear-gradient(135deg,rgba(255,95,95,.12),rgba(255,95,95,.02))] p-5 soft-ring">
                <div className="mb-6 flex items-start justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-red-400/15 text-red-300"><AlertTriangle className="size-5" /></span>
                  <Badge className="bg-red-400 text-[#250606] hover:bg-red-400">Emerging hotspot</Badge>
                </div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-red-200/70">{leadHotspot.category} infrastructure</p>
                <h2 className="mt-2 text-2xl font-black">{leadHotspot.area}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">Reports suggest {leadHotspot.issue.toLowerCase()} affecting residents across the area.</p>
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-red-200/10 pt-4">
                  <div><p className="text-xs text-muted-foreground">Priority</p><p className="mt-1 font-mono text-xl font-bold">{leadHotspot.priority}/10</p></div>
                  <div><p className="text-xs text-muted-foreground">24h change</p><p className="mt-1 font-mono text-xl font-bold text-red-300">+{leadHotspot.growth}%</p></div>
                </div>
                <Button onClick={() => setSelected(leadHotspot)} variant="outline" className="mt-5 w-full justify-between border-red-300/20 bg-red-200/5 text-red-100 hover:bg-red-200/10">Open intelligence brief <ArrowUpRight /></Button>
              </article>

              <article className="rounded-2xl border bg-card/70 p-5 soft-ring">
                <div className="mb-4 flex items-center justify-between"><div><p className="text-xs text-muted-foreground">7-day signal</p><p className="font-bold">Complaint velocity</p></div><Gauge className="size-5 text-primary" /></div>
                <TrendBars />
                <div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>7 days ago</span><span>Today</span></div>
              </article>
            </aside>
          </section>
        </TabsContent>

        <TabsContent value="citizen" className="p-4 sm:p-6">
          <div className="mx-auto max-w-6xl">
            <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div><p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-primary">Citizen workspace</p><h1 className="text-3xl font-black tracking-tight">Your reports, clearly tracked.</h1><p className="mt-2 text-muted-foreground">No departments or complicated categories—describe the problem and we route it.</p></div>
              <ReportAction signedIn={!!viewer} onOpen={() => resetDialog(true)} className="self-start" />
            </div>
            <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
              <section className="space-y-3">
                {complaints.length === 0 ? (
                  <Empty className="min-h-72 rounded-2xl border bg-card/75">
                    <EmptyHeader><EmptyMedia variant="icon"><Send /></EmptyMedia><EmptyTitle>{viewer ? "You have no reports yet" : "Sign in to report an issue"}</EmptyTitle><EmptyDescription>{viewer ? "Your first report will be classified, saved, and connected to the city map." : "Authentication keeps every report attributable and lets you track its status privately."}</EmptyDescription></EmptyHeader>
                    <EmptyContent><ReportAction signedIn={!!viewer} onOpen={() => resetDialog(true)} /></EmptyContent>
                  </Empty>
                ) : complaints.map((report) => (
                  <article key={report.id} className="rounded-2xl border bg-card/75 p-5 soft-ring">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div><p className="mb-2 font-mono text-xs text-muted-foreground">{report.trackingCode}</p><h2 className="font-bold">{report.description}</h2><p className="mt-1 text-sm text-muted-foreground">{report.location} · {report.category} · {report.subcategory}</p></div>
                      <Badge className={`shrink-0 border-0 ${report.status === "Resolved" ? "bg-primary/10 text-primary" : report.status === "Under Investigation" ? "bg-amber-300/10 text-amber-200" : "bg-sky-300/10 text-sky-200"}`}>{report.status}</Badge>
                    </div>
                    {report.evidenceKey && <a href={`/api/evidence?key=${encodeURIComponent(report.evidenceKey)}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ImagePlus className="size-4" /> View evidence</a>}
                    <div className="mt-5 flex items-center gap-1.5" aria-label={`Status: ${report.status}`}>
                      {[0,1,2,3].map((step) => <span key={step} className={`h-1.5 flex-1 rounded-full ${report.status === "Resolved" || step < (report.status === "Under Investigation" ? 2 : 1) ? "bg-primary" : "bg-secondary"}`} />)}
                    </div>
                  </article>
                ))}
              </section>
              <aside className="rounded-2xl border bg-card/75 p-6 soft-ring">
                <Sparkles className="size-6 text-primary" />
                <h2 className="mt-5 text-xl font-bold">AI handles the routing.</h2>
                <p className="mt-2 leading-7 text-muted-foreground">Write what happened in your own words. The system identifies the issue, checks nearby reports, estimates priority, and updates the right city zone.</p>
                <div className="mt-6 space-y-4">
                  {["Category and department", "Duplicate incident check", "Severity and zone priority"].map((x, i) => <div key={x} className="flex items-center gap-3 text-sm"><span className="grid size-7 place-items-center rounded-full bg-primary/10 font-mono text-xs text-primary">0{i+1}</span>{x}</div>)}
                </div>
              </aside>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="organizations" className="p-4 sm:p-6">
          <div className="mx-auto max-w-6xl">
            <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div><p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-primary">{viewer?.organizationName ? `Matched for ${viewer.organizationName}` : "Organization workspace"}</p><h1 className="text-3xl font-black tracking-tight">Relevant problems, ranked.</h1><p className="mt-2 text-muted-foreground">Verified organizations can investigate civic opportunities in their operating area.</p></div>
              <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={orgSearch} onChange={(event) => setOrgSearch(event.target.value)} className="pl-9" placeholder="Search area or issue" /></div>
            </div>
            {!viewer && <div className="mb-5 flex flex-col justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center"><div><p className="font-bold">Organization access is protected</p><p className="mt-1 text-sm text-muted-foreground">Sign in, apply with your organization details, and wait for owner verification.</p></div><Button asChild><a href="/signin-with-chatgpt?return_to=%2Faccount" target="_top"><LogIn /> Sign in as organization</a></Button></div>}
            {viewer?.role === "citizen" && <div className="mb-5 flex flex-col justify-between gap-4 rounded-2xl border bg-card/75 p-5 sm:flex-row sm:items-center"><div><p className="font-bold">Want to act as an organization?</p><p className="mt-1 text-sm text-muted-foreground">Submit your profile for owner verification first.</p></div><Button asChild variant="outline"><a href="/account"><Building2 /> Apply now</a></Button></div>}
            {viewer?.role === "organization_pending" && <div className="mb-5 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5"><p className="font-bold text-amber-100">Verification pending</p><p className="mt-1 text-sm text-muted-foreground">The CIVIQ owner must approve your organization before you can investigate issues.</p></div>}
            <section className="grid gap-4">
              {hotspots.filter((h) => (h.category === "Water" || h.id === 2) && `${h.area} ${h.issue}`.toLowerCase().includes(orgSearch.toLowerCase())).map((h, index) => {
                const Icon = layerConfig[h.category].icon;
                const isAdopted = adopted.includes(h.id);
                return (
                  <article key={h.id} className="grid gap-5 rounded-2xl border bg-card/75 p-5 soft-ring md:grid-cols-[auto_1fr_auto] md:items-center">
                    <div className="grid size-14 place-items-center rounded-2xl" style={{ background: layerConfig[h.category].soft, color: layerConfig[h.category].color }}><Icon className="size-6" /></div>
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2"><span className="font-mono text-xs text-muted-foreground">MATCH 0{index+1}</span><PriorityBadge value={h.priority} />{isAdopted && <Badge className="bg-primary text-primary-foreground">Under investigation</Badge>}</div>
                      <h2 className="text-lg font-bold">{h.area} · {h.issue}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{h.reports} reports · +{h.growth}% in 24h · Active for {h.since}</p>
                      <div className="mt-3 flex items-center gap-2 text-xs text-primary"><ShieldCheck className="size-3.5" /> {h.category === "Water" ? "94% expertise match" : "68% regional match"}</div>
                    </div>
                    <div className="flex gap-2 md:justify-end"><Button variant="outline" onClick={() => setSelected(h)}>Review</Button>{canInvestigate ? <Button disabled={isAdopted} onClick={() => adoptIssue(h.id)}>{isAdopted ? <><CheckCircle2 /> Adopted</> : <>Investigate <ArrowUpRight /></>}</Button> : <Button asChild variant="secondary"><a href={viewer ? "/account" : "/signin-with-chatgpt?return_to=%2Faccount"} target={viewer ? undefined : "_top"}>{viewer?.role === "organization_pending" ? "Pending approval" : viewer ? "Apply to act" : "Sign in to act"}</a></Button>}</div>
                  </article>
                );
              })}
            </section>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={reportOpen} onOpenChange={resetDialog}>
        <DialogContent className="border-border bg-card sm:max-w-xl">
          {!submitted ? (
            <form onSubmit={submitReport}>
              <DialogHeader>
                <div className="mb-3 grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Send className="size-5" /></div>
                <DialogTitle className="text-2xl">Report an issue</DialogTitle>
                <DialogDescription>Describe what happened. You don’t need to know the department or category.</DialogDescription>
              </DialogHeader>
              <div className="my-6 space-y-5">
                <label className="block"><span className="mb-2 block text-sm font-semibold">What is happening?</span><Textarea name="description" required minLength={12} maxLength={1200} className="min-h-32 resize-none" placeholder="Example: Water has been leaking from the main pipe since yesterday..." /></label>
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3"><span className="text-sm font-semibold">Location</span><Button type="button" size="sm" variant="outline" onClick={captureReportLocation} disabled={locating}>{locating ? <><Clock3 className="animate-spin" /> Locating…</> : <><LocateFixed /> Use my GPS</>}</Button></div>
                  <div className="relative"><Navigation className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" /><Input name="location" required maxLength={160} className="pl-9" defaultValue="Sector 17, Rohini, Delhi" /></div>
                  <p className={`mt-2 text-xs ${reportCoordinates ? "text-primary" : "text-muted-foreground"}`}>{reportCoordinates ? `GPS attached · ${reportCoordinates.latitude.toFixed(5)}, ${reportCoordinates.longitude.toFixed(5)} · ±${Math.round(reportCoordinates.accuracy)} m` : "Add GPS for precise H3 zone placement, or keep the typed area."}</p>
                </div>
                <label className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-dashed p-4 text-left text-sm text-muted-foreground transition hover:border-primary/60 hover:bg-primary/5"><input type="file" accept="image/jpeg,image/png,image/webp,video/mp4" className="sr-only" onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)} /><span className="grid size-9 place-items-center rounded-lg bg-secondary"><ImagePlus className="size-4" /></span><span><strong className="block text-foreground">{evidenceFile ? evidenceFile.name : "Add photo or video"}</strong>{evidenceFile ? `${(evidenceFile.size / 1024 / 1024).toFixed(1)} MB selected` : "Optional evidence · maximum 10 MB"}</span></label>
              </div>
              <DialogFooter><Button type="button" variant="ghost" onClick={() => resetDialog(false)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting ? <><Clock3 className="animate-spin" /> Processing…</> : <>Analyse & report <Sparkles /></>}</Button></DialogFooter>
            </form>
          ) : (
            <div className="py-2">
              <DialogHeader>
                <div className="mb-3 grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><CheckCircle2 className="size-6" /></div>
                <DialogTitle className="text-2xl">Issue understood</DialogTitle>
              <DialogDescription>Your permanent tracking code is {submission?.complaint.trackingCode}.</DialogDescription>
              </DialogHeader>
              <div className="my-6 rounded-2xl border bg-background/40 p-5">
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-sky-300">{submission?.analysis.category} infrastructure</p><h3 className="mt-1 text-lg font-bold">{submission?.analysis.subcategory}</h3></div><Badge className={Number(submission?.analysis.severity) >= 7 ? "bg-red-400/15 text-red-200" : "bg-amber-300/15 text-amber-200"}>{Number(submission?.analysis.severity) >= 7 ? "High" : "Moderate"} severity</Badge></div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-secondary/70 p-3"><p className="text-xs text-muted-foreground">AI confidence</p><p className="mt-1 font-mono font-bold">{Math.round(Number(submission?.analysis.confidence) * 100)}%</p></div><div className="rounded-xl bg-secondary/70 p-3"><p className="text-xs text-muted-foreground">Similar nearby</p><p className="mt-1 font-mono font-bold">{submission?.analysis.similarReports ?? 0} reports</p></div></div>
                <div className="mt-4 flex items-center gap-2 text-sm text-primary"><CircleDot className="size-4" /> Attached to the {submission?.hotspot.area} H3 intelligence zone</div>
                {submission?.complaint.h3Cell && <p className="mt-2 break-all font-mono text-[11px] text-muted-foreground">Zone ID · {submission.complaint.h3Cell}</p>}
              </div>
              <DialogFooter><Button onClick={() => resetDialog(false)} className="w-full">Done</Button></DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto border-l bg-card sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader className="border-b p-6">
                <div className="mb-4 flex items-center justify-between pr-8"><Badge className="bg-red-400/15 text-red-200 hover:bg-red-400/15">{selected.priority >= 8 ? "High priority" : "Active zone"}</Badge><span className="font-mono text-xs text-muted-foreground">ZONE {selected.id.toString().padStart(2,"0")}</span></div>
                <SheetTitle className="text-2xl">{selected.area}</SheetTitle>
                <SheetDescription>{selected.category} infrastructure · {selected.issue}</SheetDescription>
              </SheetHeader>
              <div className="space-y-6 p-6">
                <div className="grid grid-cols-2 gap-3">
                  {[['Priority', `${selected.priority}/10`], ['Reports', `${selected.reports}`], ['Affected radius', selected.radius], ['Active since', selected.since]].map(([k,v]) => <div key={k} className="rounded-xl border bg-background/35 p-4"><p className="text-xs text-muted-foreground">{k}</p><p className="mt-1 font-mono text-lg font-bold">{v}</p></div>)}
                </div>
                <div className="rounded-xl border bg-background/35 p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">H3 geographic zone</p><Badge variant="outline">{selected.isCluster ? "Regional Cluster" : "Resolution 8"}</Badge></div><p className="mt-2 break-all font-mono text-xs text-primary">{selected.h3Cell}</p><p className="mt-2 font-mono text-[11px] text-muted-foreground">{selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}</p></div>
                <div><div className="mb-3 flex items-center justify-between"><p className="font-semibold">Signal trend</p><span className="font-mono text-sm font-bold text-red-300">+{selected.growth}%</span></div><TrendBars /></div>
                <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5"><div className="mb-3 flex items-center gap-2 text-primary"><Lightbulb className="size-4" /><p className="text-xs font-bold uppercase tracking-widest">AI summary</p></div><p className="text-sm leading-7 text-slate-300">Multiple reports indicate {selected.issue.toLowerCase()} affecting residents across {selected.area}. The signal is geographically concentrated and has increased during the last 24 hours.</p></div>
                
                {selected.isCluster && selected.containedHotspots && (
                  <div>
                    <div className="mb-3 flex items-center justify-between"><p className="font-semibold">Aggregated Issues</p><p className="text-xs text-muted-foreground">{selected.containedHotspots.length} underlying zones</p></div>
                    <div className="space-y-3">
                      {(['Water', 'Roads', 'Waste', 'Electricity'] as const).map(cat => {
                        const catHotspots = selected.containedHotspots!.filter(h => h.category === cat);
                        if (catHotspots.length === 0) return null;
                        return (
                          <div key={cat} className="rounded-xl border bg-background/35 p-4">
                            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">{cat} ({catHotspots.length})</p>
                            <ul className="space-y-2 text-sm text-slate-300">
                              {catHotspots.map(h => (
                                <li key={h.id} className="flex gap-2"><span className="text-primary">•</span> <span><strong>{h.area}:</strong> {h.issue} <span className="text-muted-foreground">(Pri {h.priority})</span></span></li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <div className="mb-3 flex items-center justify-between"><p className="font-semibold">Why {selected.priority}?</p><p className="text-xs text-muted-foreground">Explainable priority</p></div>
                  <div className="space-y-4">
                    {(() => {
                      const isClust = selected.isCluster && selected.containedHotspots;
                      const maxReports = isClust ? Math.max(...selected.containedHotspots!.map(h => h.reports)) : selected.reports;
                      const density = isClust ? Math.min(99, maxReports * 2) : 91;
                      const severity = isClust ? Math.min(99, selected.priority * 10) : 84;
                      const growth = isClust ? Math.min(99, selected.growth / 3) : Math.min(selected.growth / 3, 96);
                      const persistence = isClust ? Math.min(99, 75 + selected.containedHotspots!.length * 2) : 72;
                      const popImpact = isClust ? Math.min(99, 70 + selected.containedHotspots!.length * 5) : 85;
                      
                      return [['Complaint density', density], ['Severity', severity], ['Growth rate', growth], ['Persistence', persistence], ['Population impact', popImpact]].map(([label,value]) => <div key={String(label)}><div className="mb-1.5 flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-mono">{(Number(value)/10).toFixed(1)}</span></div><Progress value={Number(value)} className="h-1.5" /></div>)
                    })()}
                  </div>
                </div>
              </div>
              <SheetFooter className="border-t bg-background/20 p-6">{canInvestigate ? <Button onClick={() => adoptIssue(selected.id)} disabled={adopted.includes(selected.id)} className="w-full">{adopted.includes(selected.id) ? <><CheckCircle2 /> Under investigation</> : <><Waves /> Investigate issue</>}</Button> : <Button asChild className="w-full"><a href={viewer ? "/account" : "/signin-with-chatgpt?return_to=%2Faccount"} target={viewer ? undefined : "_top"}>{viewer?.role === "organization_pending" ? "Organization approval pending" : viewer ? "Apply as an organization" : "Sign in to investigate"}</a></Button>}</SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </main>
  );
}
