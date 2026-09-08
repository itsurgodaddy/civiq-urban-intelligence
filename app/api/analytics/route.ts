import { getD1 } from "@/db";
import { analyticsQueries, fillTrend, reportRanges, type ReportAnalytics, type ReportRange } from "@/lib/report-analytics";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const range = params.get("range") ?? "30d";
  const category = params.get("category") ?? "All";
  const query = params.get("q") ?? "";
  if (!Object.hasOwn(reportRanges, range) || !["All", "Roads", "Water", "Waste", "Electricity"].includes(category) || query.length > 160) {
    return Response.json({ error: "Invalid analytics filters." }, { status: 400 });
  }
  try {
    const db = getD1();
    const queries = analyticsQueries(range as ReportRange, category, query);
    // Expose aggregate counts only. Descriptions, identities, exact coordinates
    // and evidence remain behind their existing account-specific endpoints.
    const results = await db.batch([
      db.prepare(queries.totals).bind(...queries.bindings),
      db.prepare(queries.zones).bind(...queries.bindings),
      db.prepare(queries.categories).bind(...queries.bindings),
      db.prepare(queries.trend).bind(...queries.bindings),
    ]);
    const analytics: ReportAnalytics = {
      range: range as ReportRange, start: queries.start, end: queries.end,
      totals: results[0].results[0] as ReportAnalytics["totals"],
      zones: results[1].results as ReportAnalytics["zones"],
      categories: results[2].results as ReportAnalytics["categories"],
      trend: fillTrend(range as ReportRange, queries.start, queries.end, results[3].results as ReportAnalytics["trend"]),
    };
    return Response.json(analytics, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Report analytics unavailable", error);
    return Response.json({ error: "Report analytics are temporarily unavailable." }, { status: 503 });
  }
}
