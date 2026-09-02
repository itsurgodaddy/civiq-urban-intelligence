"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowUpRight, Building2, CheckCircle2,
  ChevronRight, CircleDot, Clock3, Droplets, Gauge, ImagePlus,
  Layers3, Lightbulb, LocateFixed, Map as MapIcon, Navigation,
  Plus, Radio, Route, Search, Send, ShieldCheck, Sparkles,
  Trash2, UserRound, Waves, Wrench, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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

type Layer = "All" | "Water" | "Roads" | "Waste" | "Electricity";
type Hotspot = {
  id: number; area: string; category: Exclude<Layer, "All">; issue: string;
  priority: number; reports: number; growth: number; since: string;
  radius: string; position: { left: string; top: string };
};

const hotspots: Hotspot[] = [
  { id: 1, area: "Sector 17", category: "Water", issue: "Probable pipeline leakage", priority: 8.7, reports: 37, growth: 270, since: "3 days", radius: "1.3 km", position: { left: "50%", top: "42%" } },
  { id: 2, area: "Sector 24", category: "Roads", issue: "Recurring road damage", priority: 7.1, reports: 22, growth: 84, since: "8 days", radius: "0.8 km", position: { left: "69%", top: "58%" } },
  { id: 3, area: "Model Town", category: "Waste", issue: "Uncollected solid waste", priority: 6.4, reports: 19, growth: 41, since: "5 days", radius: "0.6 km", position: { left: "30%", top: "62%" } },
  { id: 4, area: "Rithala", category: "Electricity", issue: "Streetlight outage cluster", priority: 4.9, reports: 11, growth: 18, since: "2 days", radius: "0.4 km", position: { left: "62%", top: "24%" } },
  { id: 5, area: "Sector 11", category: "Water", issue: "Low water pressure", priority: 4.3, reports: 8, growth: 12, since: "2 days", radius: "0.3 km", position: { left: "35%", top: "30%" } },
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

function HotspotMap({ layer, onSelect }: { layer: Layer; onSelect: (h: Hotspot) => void }) {
  const visible = useMemo(() => hotspots.filter((h) => layer === "All" || h.category === layer), [layer]);
  return (
    <div className="map-grid relative min-h-[520px] w-full rounded-2xl border soft-ring" aria-label={`${layer} intelligence map`}>
      <div className="absolute left-[11%] top-[17%] z-[2] -rotate-12 text-xs font-semibold tracking-[.18em] text-slate-500">ROHINI</div>
      <div className="absolute bottom-[19%] right-[12%] z-[2] rotate-6 text-xs font-semibold tracking-[.18em] text-slate-500">PITAMPURA</div>
      <div className="absolute left-[7%] top-1/2 z-[2] h-[5px] w-[88%] -rotate-6 rounded-full border-y border-slate-600/20 bg-slate-600/15" />
      <div className="absolute left-[43%] top-[7%] z-[2] h-[88%] w-[4px] rotate-12 rounded-full border-x border-slate-600/20 bg-slate-600/15" />

      {visible.map((h) => {
        const config = layerConfig[h.category];
        const size = 62 + h.priority * 5;
        return (
          <button
            key={h.id}
            onClick={() => onSelect(h)}
            className="hex absolute z-10 grid place-items-center border-0 outline-none focus-visible:ring-2 focus-visible:ring-white"
            style={{
              left: h.position.left, top: h.position.top, width: size, height: size,
              transform: "translate(-50%, -50%)",
              background: `radial-gradient(circle at 50% 45%, ${config.color}, ${config.soft})`,
              boxShadow: `0 0 ${Math.round(h.priority * 5)}px ${config.soft}`,
            }}
            aria-label={`Open ${h.area} ${h.category} hotspot`}
          >
            <span className="font-mono text-sm font-black text-white drop-shadow-md">{h.priority.toFixed(1)}</span>
          </button>
        );
      })}

      <div className="absolute bottom-4 left-4 z-20 rounded-xl border bg-[#091411]/90 p-3 backdrop-blur">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priority</p>
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span>Low</span>
          <div className="h-2 w-24 rounded-full bg-gradient-to-r from-sky-400/25 via-sky-400 to-red-400" />
          <span>Critical</span>
        </div>
      </div>
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-full border bg-[#091411]/90 px-3 py-2 text-xs text-slate-300 backdrop-blur">
        <Radio className="size-3 animate-pulse text-primary" /> Live intelligence
      </div>
      <div className="scanline absolute inset-x-0 top-1/2 z-[3] h-px opacity-50" />
    </div>
  );
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

export default function Home() {
  const [layer, setLayer] = useState<Layer>("All");
  const [selected, setSelected] = useState<Hotspot | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [adopted, setAdopted] = useState<number[]>([]);

  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  function adoptIssue(id: number) {
    setAdopted((current) => current.includes(id) ? current : [...current, id]);
    toast.success("Issue moved to investigation", { description: "Citizens will now see the updated response status." });
    setSelected(null);
  }

  function resetDialog(open: boolean) {
    setReportOpen(open);
    if (!open) window.setTimeout(() => setSubmitted(false), 250);
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
            <Button onClick={() => resetDialog(true)} className="rounded-full px-4 font-bold">
              <Plus className="size-4" /> Report issue
            </Button>
            <button className="grid size-9 place-items-center rounded-full border bg-secondary" aria-label="Open profile">
              <UserRound className="size-4" />
            </button>
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
            <StatCard label="Active reports" value="1,284" change="+12.4%" icon={Activity} />
            <StatCard label="Emerging zones" value="08" change="2 critical" icon={Radio} />
            <StatCard label="Under action" value="34" change="+6 today" icon={Wrench} />
            <StatCard label="Resolved this week" value="127" change="+18.1%" icon={CheckCircle2} />
          </section>

          <section className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_310px]">
            <aside className="order-2 rounded-2xl border bg-card/70 p-4 soft-ring xl:order-1">
              <div className="mb-4 flex items-center justify-between">
                <div><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Hotspots</p><h2 className="mt-1 text-lg font-bold">Needs attention</h2></div>
                <Badge variant="secondary">5 live</Badge>
              </div>
              <div className="space-y-2">
                {hotspots.slice(0, 4).map((h, index) => {
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
              <Button variant="ghost" className="mt-3 w-full justify-between text-muted-foreground">View all zones <ChevronRight /></Button>
            </aside>

            <div className="order-1 xl:order-2"><HotspotMap layer={layer} onSelect={setSelected} /></div>

            <aside className="order-3 space-y-4">
              <article className="rounded-2xl border border-red-400/20 bg-[linear-gradient(135deg,rgba(255,95,95,.12),rgba(255,95,95,.02))] p-5 soft-ring">
                <div className="mb-6 flex items-start justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-red-400/15 text-red-300"><AlertTriangle className="size-5" /></span>
                  <Badge className="bg-red-400 text-[#250606] hover:bg-red-400">Emerging hotspot</Badge>
                </div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-red-200/70">Water infrastructure</p>
                <h2 className="mt-2 text-2xl font-black">Sector 17</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">Reports suggest a probable pipeline leakage affecting water pressure across the area.</p>
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-red-200/10 pt-4">
                  <div><p className="text-xs text-muted-foreground">Priority</p><p className="mt-1 font-mono text-xl font-bold">8.7/10</p></div>
                  <div><p className="text-xs text-muted-foreground">24h change</p><p className="mt-1 font-mono text-xl font-bold text-red-300">+270%</p></div>
                </div>
                <Button onClick={() => setSelected(hotspots[0])} variant="outline" className="mt-5 w-full justify-between border-red-300/20 bg-red-200/5 text-red-100 hover:bg-red-200/10">Open intelligence brief <ArrowUpRight /></Button>
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
              <Button onClick={() => resetDialog(true)}><Plus /> Report a new issue</Button>
            </div>
            <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
              <section className="space-y-3">
                {[
                  { id: "#1842", title: "Pipeline leaking near main market", place: "Sector 17, Rohini", category: "Water · Pipeline leakage", status: "Under investigation", color: "text-amber-200 bg-amber-300/10" },
                  { id: "#1736", title: "Streetlight not working for three nights", place: "Pocket B, Sector 11", category: "Electricity · Streetlight", status: "Solution proposed", color: "text-sky-200 bg-sky-300/10" },
                  { id: "#1594", title: "Garbage accumulating beside community park", place: "Model Town", category: "Waste · Collection", status: "Resolved", color: "text-primary bg-primary/10" },
                ].map((report) => (
                  <article key={report.id} className="rounded-2xl border bg-card/75 p-5 soft-ring">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div><p className="mb-2 font-mono text-xs text-muted-foreground">{report.id}</p><h2 className="font-bold">{report.title}</h2><p className="mt-1 text-sm text-muted-foreground">{report.place} · {report.category}</p></div>
                      <Badge className={`${report.color} shrink-0 border-0 hover:${report.color}`}>{report.status}</Badge>
                    </div>
                    <div className="mt-5 flex items-center gap-1.5" aria-label={`Status: ${report.status}`}>
                      {[0,1,2,3].map((step) => <span key={step} className={`h-1.5 flex-1 rounded-full ${report.status === "Resolved" || step < (report.status === "Solution proposed" ? 3 : 2) ? "bg-primary" : "bg-secondary"}`} />)}
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
              <div><p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-primary">Matched for JalSetu Foundation</p><h1 className="text-3xl font-black tracking-tight">Relevant problems, ranked.</h1><p className="mt-2 text-muted-foreground">Water infrastructure opportunities within your Delhi NCR operating area.</p></div>
              <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search area or issue" /></div>
            </div>
            <section className="grid gap-4">
              {hotspots.filter((h) => h.category === "Water" || h.id === 2).map((h, index) => {
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
                    <div className="flex gap-2 md:justify-end"><Button variant="outline" onClick={() => setSelected(h)}>Review</Button><Button disabled={isAdopted} onClick={() => adoptIssue(h.id)}>{isAdopted ? <><CheckCircle2 /> Adopted</> : <>Investigate <ArrowUpRight /></>}</Button></div>
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
                <label className="block"><span className="mb-2 block text-sm font-semibold">What is happening?</span><Textarea required minLength={12} className="min-h-32 resize-none" placeholder="Example: Water has been leaking from the main pipe since yesterday..." /></label>
                <label className="block"><span className="mb-2 block text-sm font-semibold">Location</span><div className="relative"><Navigation className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" /><Input required className="pl-9" defaultValue="Sector 17, Rohini, Delhi" /></div></label>
                <button type="button" className="flex w-full items-center gap-3 rounded-xl border border-dashed p-4 text-left text-sm text-muted-foreground transition hover:border-primary/60 hover:bg-primary/5"><span className="grid size-9 place-items-center rounded-lg bg-secondary"><ImagePlus className="size-4" /></span><span><strong className="block text-foreground">Add photo or video</strong>Optional evidence helps verification</span></button>
              </div>
              <DialogFooter><Button type="button" variant="ghost" onClick={() => resetDialog(false)}>Cancel</Button><Button type="submit">Analyse & report <Sparkles /></Button></DialogFooter>
            </form>
          ) : (
            <div className="py-2">
              <DialogHeader>
                <div className="mb-3 grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><CheckCircle2 className="size-6" /></div>
                <DialogTitle className="text-2xl">Issue understood</DialogTitle>
                <DialogDescription>Your report has been linked to the city intelligence layer.</DialogDescription>
              </DialogHeader>
              <div className="my-6 rounded-2xl border bg-background/40 p-5">
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-sky-300">Water infrastructure</p><h3 className="mt-1 text-lg font-bold">Pipeline leakage</h3></div><Badge className="bg-red-400/15 text-red-200">High severity</Badge></div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-secondary/70 p-3"><p className="text-xs text-muted-foreground">AI confidence</p><p className="mt-1 font-mono font-bold">94%</p></div><div className="rounded-xl bg-secondary/70 p-3"><p className="text-xs text-muted-foreground">Similar nearby</p><p className="mt-1 font-mono font-bold">13 reports</p></div></div>
                <div className="mt-4 flex items-center gap-2 text-sm text-primary"><CircleDot className="size-4" /> Attached to emerging Sector 17 hotspot</div>
              </div>
              <DialogFooter><Button onClick={() => resetDialog(false)} className="w-full">View report status</Button></DialogFooter>
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
                <div><div className="mb-3 flex items-center justify-between"><p className="font-semibold">Signal trend</p><span className="font-mono text-sm font-bold text-red-300">+{selected.growth}%</span></div><TrendBars /></div>
                <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5"><div className="mb-3 flex items-center gap-2 text-primary"><Lightbulb className="size-4" /><p className="text-xs font-bold uppercase tracking-widest">AI summary</p></div><p className="text-sm leading-7 text-slate-300">Multiple reports indicate {selected.issue.toLowerCase()} affecting residents across {selected.area}. The signal is geographically concentrated and has increased during the last 24 hours.</p></div>
                <div>
                  <div className="mb-3 flex items-center justify-between"><p className="font-semibold">Why {selected.priority}?</p><p className="text-xs text-muted-foreground">Explainable priority</p></div>
                  <div className="space-y-4">
                    {[['Complaint density', 91], ['Severity', 84], ['Growth rate', Math.min(selected.growth / 3, 96)], ['Persistence', 72], ['Population impact', 85]].map(([label,value]) => <div key={String(label)}><div className="mb-1.5 flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-mono">{(Number(value)/10).toFixed(1)}</span></div><Progress value={Number(value)} className="h-1.5" /></div>)}
                  </div>
                </div>
              </div>
              <SheetFooter className="border-t bg-background/20 p-6"><Button onClick={() => adoptIssue(selected.id)} disabled={adopted.includes(selected.id)} className="w-full">{adopted.includes(selected.id) ? <><CheckCircle2 /> Under investigation</> : <><Waves /> Investigate issue</>}</Button><Button variant="outline" className="w-full">View evidence</Button></SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </main>
  );
}
