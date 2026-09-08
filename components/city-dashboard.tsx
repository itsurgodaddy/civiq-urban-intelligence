"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowUpRight, CheckCircle2, Hexagon, Layers3, Search, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IntelligenceMap, type GeographicHotspot } from "@/components/intelligence-map";
import { ReportAnalyticsPanels } from "@/components/report-analytics-panels";
import type { ReportAnalytics, ReportRange } from "@/lib/report-analytics";

type Zone = GeographicHotspot & { status?: string };
type Props = {
  hotspots: Zone[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onBrief: (zone: Zone) => void;
};
const categories = ["All", "Roads", "Water", "Waste", "Electricity"] as const;
const categoryColors: Record<string, string> = { Roads: "#ff625c", Water: "#42bdff", Waste: "#42dc8b", Electricity: "#efb647" };
export function severity(priority: number) {
  if (priority >= 8) return { label: "Critical", color: "#ff514e" };
  if (priority >= 6) return { label: "High", color: "#ff9d25" };
  if (priority >= 3) return { label: "Medium", color: "#e8d642" };
  return { label: "Low", color: "#6bdc71" };
}

export function CityDashboard({ hotspots, loading, error, onRetry, onBrief }: Props) {
  const [category, setCategory] = useState<(typeof categories)[number]>("All");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showHexagons, setShowHexagons] = useState(true);
  const [range, setRange] = useState<ReportRange>("30d");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: string; data: ReportAnalytics | null; error: string | null } | null>(null);
  const analyticsKey = JSON.stringify([range, category, query.trim(), retry]);
  const analyticsPending = result?.key !== analyticsKey;
  const analytics = !analyticsPending ? result?.data ?? null : null;
  const analyticsError = !analyticsPending ? result?.error : null;
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ range, category, q: query.trim() });
        const response = await fetch(`/api/analytics?${params}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Report analytics could not be loaded. Please retry.");
        const data = await response.json() as ReportAnalytics;
        if (!controller.signal.aborted) setResult({ key: analyticsKey, data, error: null });
      } catch (failure) {
        if (!controller.signal.aborted) setResult({ key: analyticsKey, data: null, error: failure instanceof Error ? failure.message : "Analytics unavailable." });
      }
    }, 200);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [analyticsKey, range, category, query, hotspots]);
  const recordedCounts = useMemo(() => new Map(analytics?.zones.map(zone => [zone.id, zone.count]) ?? []), [analytics]);
  const zones = useMemo(() => hotspots.filter(zone =>
    (category === "All" || zone.category === category) &&
    `${zone.area} ${zone.issue}`.toLowerCase().includes(query.trim().toLowerCase()) &&
    (includeInactive || recordedCounts.has(zone.id))
  ), [hotspots, category, query, includeInactive, recordedCounts]);
  const selected = zones.find(zone => zone.id === selectedId) ?? zones[0];
  const reportCount = analytics?.totals.received ?? 0;
  const filteredCount = reportCount;
  const breakdown = categories.slice(1).map(name => ({ name, count: analytics?.categories.find(item => item.name === name)?.count ?? 0 }));
  const tone = selected ? severity(selected.priority) : null;

  return <div className="city-dashboard">
    <aside className="city-overview city-panel">
      <h1 className="city-kicker">City overview</h1>
      <div className="city-stat-list">
        {[
          { label: "Recorded complaints", value: reportCount, icon: Activity, color: "#b1a0ff" },
          { label: "Active zones", value: hotspots.filter(zone => recordedCounts.has(zone.id) && zone.status !== "Resolved").length, icon: Layers3, color: "#36d9f2" },
          { label: "Under investigation", value: hotspots.filter(zone => recordedCounts.has(zone.id) && zone.status === "Under Investigation").length, icon: Wrench, color: "#ffb648" },
          { label: "Resolved zones", value: hotspots.filter(zone => recordedCounts.has(zone.id) && zone.status === "Resolved").length, icon: CheckCircle2, color: "#54e5a0" },
        ].map(({ label, value, icon: Icon, color }) => <article key={label} className="city-stat"><span className="city-stat-icon" style={{ color, background: `${color}18` }}><Icon size={25} /></span><div><strong>{loading || analyticsPending || !analytics ? "—" : value.toLocaleString()}</strong><span>{label}</span></div></article>)}
      </div>
      <div className="city-filter-heading"><h2 className="city-kicker">Categories</h2><button onClick={() => { setCategory("All"); setQuery(""); setRange("30d"); setIncludeInactive(false); }}>Reset</button></div>
      <div className="city-categories" aria-label="Filter zones by category">
        {categories.map(name => <Button key={name} variant="ghost" aria-pressed={category === name} onClick={() => setCategory(name)} className="city-category"><span style={{ color: categoryColors[name] ?? "#38def6" }}>⬡</span>{name === "All" ? "All categories" : name}<span className="city-category-count">{hotspots.filter(zone => name === "All" || zone.category === name).length}</span></Button>)}
      </div>
      <div className="city-data-note"><ShieldCheck size={17} /><p>Counts use saved complaints in the selected period. Zone statuses and priorities show their current state. Demonstration totals are excluded from charts.</p></div>
    </aside>

    <section className="city-workspace" aria-label="Geographic intelligence">
      <div className="city-map-toolbar"><label className="city-search"><Search size={17} /><Input aria-label="Search zones by area or issue" maxLength={160} placeholder="Search area or issue…" value={query} onChange={event => setQuery(event.target.value)} /></label><Button variant="outline" aria-pressed={showHexagons} onClick={() => setShowHexagons(value => !value)}><Hexagon size={16} /> H3 {showHexagons ? "on" : "off"}</Button></div>
      <div className="city-period-toolbar"><div className="city-period-buttons" aria-label="Report time period">{([["24h", "24H"], ["7d", "7D"], ["30d", "30D"], ["6m", "6M"]] as const).map(([value, label]) => <Button key={value} size="sm" variant={range === value ? "default" : "outline"} aria-pressed={range === value} onClick={() => setRange(value)}>{label}</Button>)}</div><Button size="sm" variant="outline" aria-pressed={includeInactive} onClick={() => setIncludeInactive(value => !value)}>{includeInactive ? "All zones shown" : "Zones with reports"}</Button></div>
      <p className="city-footnote">{includeInactive ? "Map includes zones without reports in this period, including sample zones. Charts count recorded complaints only." : "Map shows zones with recorded complaints in this period."} {range === "6m" ? "6M covers 180 days." : ""}</p>
      {analyticsError && <div className="city-notice" role="alert">{analyticsError}<Button size="sm" variant="outline" onClick={() => setRetry(value => value + 1)}>Retry analytics</Button></div>}
      {error && <div className="city-notice" role="alert">{error}<Button variant="outline" size="sm" onClick={onRetry}>Retry</Button></div>}
      <div className="city-map-stage"><IntelligenceMap hotspots={zones} selectedId={zones.some(zone => zone.id === selectedId) ? selectedId : null} onSelect={zone => setSelectedId(zone.id)} showHexagons={showHexagons} />
        {(loading || analyticsPending) && <div className="city-empty-map" role="status">Loading report activity…</div>}
        {!loading && !analyticsPending && !error && !analyticsError && zones.length === 0 && <div className="city-empty-map" role="status">No recorded reports match this period. Try a longer period or show all zones.<Button className="mt-3" variant="outline" onClick={() => setIncludeInactive(true)}>Show all zones</Button></div>}
      </div>
      <div className="city-analytics-row">
        <article className="city-panel city-summary"><h2 className="city-kicker"><Sparkles size={16} /> Zone summary</h2>{selected ? <><p><strong>{selected.area}</strong> has {analytics ? recordedCounts.get(selected.id) ?? 0 : "—"} recorded complaints in this period. Current zone issue: {selected.issue.toLowerCase()}.</p><p>Recorded priority is {selected.priority.toFixed(1)}/10. Current response: {selected.status ?? "Reported"}.</p><span className="city-footnote">Record-based summary · not AI verification</span></> : <p>Select an available zone to see its summary.</p>}</article>
        <article className="city-panel"><h2 className="city-kicker">Reports by category</h2><p className="city-footnote">Recorded complaints · selected period</p><div className="city-breakdown">{breakdown.map(item => <div key={item.name}><div className="city-breakdown-label"><span>{item.name}</span><strong>{analytics ? item.count : "—"}</strong></div><div className="city-bar"><span style={{ width: `${filteredCount ? item.count / filteredCount * 100 : 0}%`, background: categoryColors[item.name] }} /></div></div>)}</div></article>
      </div>
      <ReportAnalyticsPanels data={analytics} pending={analyticsPending} />
      <section className="city-panel city-ranked"><div className="city-filter-heading"><h2 className="city-kicker">Priority zones</h2><span className="city-footnote">{zones.length} matching zones</span></div><div className="city-zone-list">{zones.map(zone => <button key={zone.id} aria-pressed={selected?.id === zone.id} onClick={() => setSelectedId(zone.id)}><Hexagon size={19} color={severity(zone.priority).color} /><span><strong>{zone.area}</strong><small>{zone.category} · {analytics ? recordedCounts.get(zone.id) ?? 0 : "—"} in period</small></span><b style={{ color: severity(zone.priority).color }}>{zone.priority.toFixed(1)}</b></button>)}{loading && <p role="status">Loading city records…</p>}</div></section>
    </section>

    <aside className="city-details">
      <article className="city-panel city-zone-detail" style={{ borderColor: tone ? `${tone.color}70` : undefined }}><h2 className="city-kicker" style={{ color: tone?.color }}>Zone details</h2>{selected ? <><div className="city-zone-title"><h3>Z-{String(selected.id).padStart(3, "0")}</h3><span style={{ color: tone?.color }}>{tone?.label}</span></div><p className="city-zone-area">{selected.area}</p><div className="city-issue-title">{selected.issue}</div><div className="city-zone-metrics"><div><strong>{analytics ? recordedCounts.get(selected.id) ?? 0 : "—"}</strong><span>Reports in period</span></div><div><strong>{selected.priority.toFixed(1)}<small>/10</small></strong><span>Current priority</span></div></div><dl className="city-zone-facts"><div><dt>Category</dt><dd>{selected.category}</dd></div><div><dt>Response</dt><dd>{selected.status ?? "Reported"}</dd></div><div><dt>H3 cell</dt><dd className="city-cell-id">{selected.h3Cell}</dd></div></dl><Button variant="outline" className="w-full" onClick={() => onBrief(selected)}>View zone brief <ArrowUpRight size={16} /></Button></> : <p className="city-zone-area">{loading ? "Loading zones…" : "No zone selected."}</p>}</article>
      <article className="city-panel city-opportunity"><h2 className="city-kicker">Response opportunity</h2>{selected ? <><h3>{selected.issue}</h3><p>{selected.area} · {selected.category}</p><dl className="city-zone-facts"><div><dt>Priority</dt><dd style={{ color: tone?.color }}>{tone?.label}</dd></div><div><dt>Action</dt><dd>{selected.status === "Resolved" ? "Completed" : selected.status === "Under Investigation" ? "In progress" : "Review required"}</dd></div></dl><p className="city-footnote">Verified organizations can review this zone and start an investigation. Matching scores and population estimates are not yet available.</p><Button variant="outline" className="w-full" onClick={() => onBrief(selected)}>Review problem <ArrowUpRight size={16} /></Button></> : <p>Opportunities appear when a zone is available.</p>}</article>
    </aside>
  </div>;
}
