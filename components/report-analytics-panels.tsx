"use client";

import { Activity, ArrowDown, Hexagon, LocateFixed, Tag } from "lucide-react";
import type { ReportAnalytics } from "@/lib/report-analytics";

export function ReportAnalyticsPanels({ data, pending }: { data: ReportAnalytics | null; pending: boolean }) {
  const trend = data?.trend ?? [];
  const max = Math.max(1, ...trend.map(point => point.count));
  const points = trend.map((point, index) => `${35 + index * 450 / Math.max(1, trend.length - 1)},${145 - point.count / max * 120}`).join(" ");
  return <div className="city-report-panels" aria-busy={pending}>
    <article className="city-panel city-trend-panel">
      <h2 className="city-kicker"><Activity size={16} /> Complaint trend</h2>
      <p className="city-footnote">{data?.range === "24h" ? "Hourly" : "Daily"} submissions · UTC · {data?.range === "6m" ? "last 180 days" : "selected period"}</p>
      {pending ? <p className="city-analytics-empty" role="status">Loading report history…</p> : !data ? <p className="city-analytics-empty">Report history is unavailable.</p> : data.totals.received === 0 ? <p className="city-analytics-empty">No recorded complaints in this period. New reports will appear here after submission.</p> : <>
        <svg className="city-trend-chart" viewBox="0 0 510 175" role="img" aria-label={`${data.totals.received} complaints in the selected period. ${data.range === "24h" ? "Hourly" : "Daily"} values available in the table below.`}>
          {[0, 0.5, 1].map(ratio => <g key={ratio}><line x1="35" x2="485" y1={145 - ratio * 120} y2={145 - ratio * 120} stroke="#263b4b" /><text x="27" y={149 - ratio * 120} textAnchor="end" fill="#9ab0c2" fontSize="12">{Number((max * ratio).toFixed(1))}</text></g>)}
          <polygon points={`35,145 ${points} 485,145`} fill="#ff625c" fillOpacity="0.12" />
          <polyline points={points} fill="none" stroke="#ff625c" strokeWidth="2.5" />
          {trend.map((point, index) => <circle key={point.bucket} cx={35 + index * 450 / Math.max(1, trend.length - 1)} cy={145 - point.count / max * 120} r={trend.length > 40 ? 1.5 : 3} fill="#ff827a"><title>{point.bucket} UTC: {point.count} reports</title></circle>)}
        </svg>
        <div className="city-trend-dates"><span>{trend[0]?.bucket} UTC</span><span>{trend.at(-1)?.bucket} UTC</span></div>
        <details className="city-trend-table"><summary>View exact counts</summary><div><table><caption>Recorded complaints by {data.range === "24h" ? "hour" : "day"} (UTC)</caption><thead><tr><th scope="col">Period</th><th scope="col">Reports</th></tr></thead><tbody>{trend.map(point => <tr key={point.bucket}><th scope="row">{point.bucket}</th><td>{point.count}</td></tr>)}</tbody></table></div></details>
      </>}
    </article>
    <article className="city-panel city-processing">
      <h2 className="city-kicker">From reports to zones</h2>
      <div className="city-processing-steps">
        {[
          { label: "Reports received", count: data?.totals.received, icon: Activity },
          { label: "Category assigned", count: data?.totals.classified, icon: Tag },
          { label: "H3 location assigned", count: data?.totals.located, icon: LocateFixed },
          { label: "Zones represented", count: data?.totals.zones, icon: Hexagon },
        ].map(({ label, count, icon: Icon }, index) => <div key={label}>{index > 0 && <ArrowDown className="city-processing-arrow" size={15} />}<div className="city-processing-step"><Icon size={19} /><strong>{pending || count === undefined ? "—" : count}</strong><span>{label}</span></div></div>)}
      </div>
      <p className="city-footnote">Categories use keyword rules. H3 locations may come from GPS or an estimated area. Multiple reports can belong to one zone.</p>
      <div className="city-processing-pending"><span>AI evidence verification</span><strong>Planned</strong><span>Confirmed duplicate merges</span><strong>Planned</strong></div>
    </article>
  </div>;
}
