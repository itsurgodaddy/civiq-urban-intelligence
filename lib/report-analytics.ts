export const reportRanges = { "24h": 1, "7d": 7, "30d": 30, "6m": 180 } as const;
export type ReportRange = keyof typeof reportRanges;
export type ReportAnalytics = {
  range: ReportRange;
  start: string;
  end: string;
  totals: { received: number; classified: number; located: number; zones: number; criticalZones: number };
  zones: Array<{ id: number; count: number }>;
  categories: Array<{ name: string; count: number }>;
  trend: Array<{ bucket: string; count: number }>;
};

const timestamp = (date: Date) => date.toISOString().slice(0, 19).replace("T", " ");

export function analyticsQueries(range: ReportRange, category: string, query: string, now = new Date()) {
  const start = new Date(now.getTime() - reportRanges[range] * 86400000);
  // SQLite stores second-precision UTC timestamps. Include the current second.
  const end = new Date(now.getTime() + 1000);
  const bindings = [timestamp(start), timestamp(end), category, category, query.trim().toLowerCase()];
  const source = `FROM complaints c LEFT JOIN hotspots h ON h.id = c.hotspot_id
    WHERE c.created_at >= ? AND c.created_at < ?
    AND (? = 'All' OR c.category = ?)
    AND instr(lower(COALESCE(h.area, '') || ' ' || COALESCE(h.issue, '')), ?) > 0`;
  const bucket = range === "24h" ? "substr(c.created_at, 1, 13)" : "substr(c.created_at, 1, 10)";
  return {
    start: start.toISOString(), end: now.toISOString(), bindings,
    totals: `SELECT COUNT(*) AS received,
      COALESCE(SUM(CASE WHEN c.category IN ('Water', 'Roads', 'Waste', 'Electricity') THEN 1 ELSE 0 END), 0) AS classified,
      COALESCE(SUM(CASE WHEN c.h3_cell IS NOT NULL AND c.h3_cell != '' THEN 1 ELSE 0 END), 0) AS located,
      COUNT(DISTINCT h.id) AS zones,
      COUNT(DISTINCT CASE WHEN h.priority >= 8 THEN h.id END) AS criticalZones ${source}`,
    zones: `SELECT h.id, COUNT(*) AS count ${source} AND h.id IS NOT NULL GROUP BY h.id`,
    categories: `SELECT c.category AS name, COUNT(*) AS count ${source} GROUP BY c.category`,
    trend: `SELECT ${bucket} AS bucket, COUNT(*) AS count ${source} GROUP BY ${bucket} ORDER BY bucket`,
  };
}

export function fillTrend(range: ReportRange, start: string, end: string, rows: ReportAnalytics["trend"]) {
  const counts = new Map(rows.map(row => [row.bucket, Number(row.count)]));
  const cursor = new Date(start);
  if (range === "24h") cursor.setUTCMinutes(0, 0, 0);
  else cursor.setUTCHours(0, 0, 0, 0);
  const result: ReportAnalytics["trend"] = [];
  const step = range === "24h" ? 3600000 : 86400000;
  for (let time = cursor.getTime(); time <= Date.parse(end); time += step) {
    const bucket = timestamp(new Date(time)).slice(0, range === "24h" ? 13 : 10);
    result.push({ bucket, count: counts.get(bucket) ?? 0 });
  }
  return result;
}
