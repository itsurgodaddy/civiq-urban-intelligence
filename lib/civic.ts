export type CivicCategory = "Water" | "Roads" | "Waste" | "Electricity";

const categoryRules: Array<{ category: CivicCategory; keywords: string[] }> = [
  { category: "Water", keywords: ["water", "pipeline", "pipe", "leak", "sewage", "drain", "pressure", "supply", "tap"] },
  { category: "Roads", keywords: ["road", "pothole", "footpath", "street", "traffic", "crack", "divider", "flyover"] },
  { category: "Waste", keywords: ["garbage", "waste", "trash", "dump", "rubbish", "dirty", "collection", "litter"] },
  { category: "Electricity", keywords: ["electricity", "power", "transformer", "streetlight", "light", "wire", "outage", "spark"] },
];

const urgentWords = ["danger", "urgent", "severe", "flood", "contaminated", "burst", "accident", "fire", "spark", "days"];

export function classifyIssue(description: string) {
  const clean = description.toLowerCase();
  const ranked = categoryRules.map((rule) => ({
    ...rule,
    score: rule.keywords.reduce((total, word) => total + (clean.includes(word) ? 1 : 0), 0),
  })).sort((a, b) => b.score - a.score);

  const winner = ranked[0];
  const category = winner.score > 0 ? winner.category : "Roads";
  const urgentMatches = urgentWords.reduce((total, word) => total + (clean.includes(word) ? 1 : 0), 0);
  const severity = Math.min(9.6, 4.5 + winner.score * 0.65 + urgentMatches * 0.55);
  const confidence = Math.min(0.97, 0.7 + winner.score * 0.055);
  const subcategory = getSubcategory(category, clean);

  return {
    category,
    subcategory,
    severity: Number(severity.toFixed(1)),
    confidence: Number(confidence.toFixed(2)),
  };
}

function getSubcategory(category: CivicCategory, text: string) {
  if (category === "Water") {
    if (text.includes("leak") || text.includes("burst")) return "Pipeline Leakage";
    if (text.includes("sewage") || text.includes("contaminated")) return "Water Contamination";
    return "Water Supply";
  }
  if (category === "Roads") return text.includes("pothole") ? "Pothole" : "Road Infrastructure";
  if (category === "Waste") return "Solid Waste Collection";
  return text.includes("streetlight") ? "Streetlight Outage" : "Power Infrastructure";
}

export function areaFromLocation(location: string) {
  const first = location.split(",")[0]?.trim();
  const normalized = (first || "Delhi Zone").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  return normalized.slice(0, 70);
}

export function issueFor(category: CivicCategory, subcategory: string) {
  if (subcategory === "Pipeline Leakage") return "Probable pipeline leakage";
  if (subcategory === "Water Contamination") return "Possible water contamination";
  if (subcategory === "Pothole") return "Recurring road damage";
  if (category === "Waste") return "Uncollected solid waste";
  if (subcategory === "Streetlight Outage") return "Streetlight outage cluster";
  return `${subcategory} reports`;
}

export function positionFromText(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  const positive = Math.abs(hash);
  return { left: 22 + (positive % 57), top: 20 + ((positive >> 5) % 58) };
}

export function calculatePriority(reportCount: number, severity: number, growth: number) {
  const density = Math.min(10, 2.5 + reportCount * 0.32);
  const growthScore = Math.min(10, growth / 30);
  const persistence = Math.min(10, 3.5 + reportCount * 0.13);
  const impact = Math.min(10, 3.2 + reportCount * 0.17);
  const result = 0.30 * density + 0.25 * severity + 0.20 * growthScore + 0.15 * persistence + 0.10 * impact;
  return Number(Math.min(10, result).toFixed(1));
}

export function trackingCode() {
  return `CIV-${Date.now().toString(36).slice(-6).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
}
