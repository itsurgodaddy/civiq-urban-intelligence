# CIVIQ Codebase Guide

This guide explains where each part of CIVIQ lives. Read the files in the order listed under **Suggested team reading order**.

## How a request moves through CIVIQ

1. A citizen uses the React interface in `app/page.tsx`.
2. The browser sends the report to `app/api/complaints/route.ts`.
3. The server checks the signed-in user through `lib/authz.ts` and `app/chatgpt-auth.ts`.
4. `lib/civic.ts` classifies the issue and calculates its priority.
5. `lib/geo.ts` assigns coordinates and an H3 cell.
6. The server writes the complaint and hotspot to Cloudflare D1.
7. The dashboard reads aggregate data through `app/api/dashboard/route.ts` and `app/api/analytics/route.ts`.
8. Evidence files are stored in Cloudflare R2 through `app/api/evidence/route.ts`.

## Frontend

| File | Responsibility |
| --- | --- |
| `app/page.tsx` | Main public page, citizen workspace, organization workspace, report form, and zone brief |
| `components/city-dashboard.tsx` | Three-column city dashboard, filters, zone list, selected-zone details, and response opportunity |
| `components/intelligence-map.tsx` | MapLibre map, OpenStreetMap tiles, H3 polygon projection, markers, map controls |
| `components/report-analytics-panels.tsx` | Complaint trend chart and report-to-zone processing panel |
| `app/account/page.tsx` | Protected account page |
| `app/account/organization-application.tsx` | Organization application form |
| `app/admin/page.tsx` | Protected admin page entry |
| `app/admin/admin-dashboard.tsx` | Admin controls for applications, reports, and hotspots |
| `app/admin/owner-claim.tsx` | One-time administrator ownership setup |
| `app/globals.css` | Colours, typography, map styles, dashboard layout, and responsive rules |
| `components/ui/*` | Reusable buttons, forms, dialogs, sheets, tabs, and other interface elements |

Files containing `"use client"` run in the visitor's browser. Page files without it usually run on the server.

## Backend API

The backend is inside the same Next.js/Vinext project. Each `route.ts` file is a server API endpoint.

| Endpoint file | Responsibility |
| --- | --- |
| `app/api/complaints/route.ts` | Validate, classify, locate, save, and cluster a citizen report |
| `app/api/dashboard/route.ts` | Return public hotspots, current-user reports, role, and city totals |
| `app/api/analytics/route.ts` | Return anonymous aggregate counts and time-series data |
| `app/api/evidence/route.ts` | Upload and retrieve evidence files from R2 |
| `app/api/me/route.ts` | Return the signed-in CIVIQ account |
| `app/api/organizations/apply/route.ts` | Save an organization application |
| `app/api/hotspots/[id]/adopt/route.ts` | Let a verified organization investigate a zone |
| `app/api/admin/route.ts` | Return admin-only operational data |
| `app/api/admin/claim/route.ts` | Claim the single admin role using the setup key |
| `app/api/admin/organizations/[id]/route.ts` | Approve or reject an organization |
| `app/api/admin/hotspots/[id]/route.ts` | Change hotspot workflow status |

## Domain logic

| File | Responsibility |
| --- | --- |
| `lib/civic.ts` | Keyword-based issue classification, severity, priority score, labels, and tracking codes |
| `lib/geo.ts` | Typed-location fallback, GPS validation support, and H3 resolution 8 cell creation |
| `lib/report-analytics.ts` | Safe analytics queries, date ranges, and empty time buckets |
| `lib/authz.ts` | Server-side roles and authorization checks |
| `app/chatgpt-auth.ts` | ChatGPT sign-in identity helpers supplied by Sites |

The current classifier is a deterministic keyword and scoring system. AI evidence verification and confirmed semantic duplicate merging are planned features; do not present them as completed ML models.

## Database and storage

| File or service | Responsibility |
| --- | --- |
| `db/schema.ts` | Source definition of all D1 tables, columns, relationships, and indexes |
| `db/index.ts` | Server helper that opens the D1 database binding |
| `drizzle/*.sql` | Ordered database migrations applied during deployment |
| `drizzle/meta/*` | Drizzle migration history; do not edit applied files manually |
| Cloudflare D1 | Stores users, complaints, hotspots, organizations, and adoptions |
| Cloudflare R2 | Stores uploaded photos and videos; D1 stores only their object keys |

Main tables:

- `site_users`: authenticated users and roles
- `complaints`: individual citizen reports
- `hotspots`: H3-based aggregated problem zones
- `organizations`: organization applications and verification status
- `adoptions`: which organization is investigating which hotspot

D1 and R2 are managed by ChatGPT Sites. Their production contents are not stored in GitHub, and there is no database password or R2 key in the repository.

## Hosting and configuration

| File | Responsibility |
| --- | --- |
| `.openai/hosting.json` | Sites project identity and logical D1/R2 binding names |
| `vite.config.ts` | Vinext, Cloudflare Worker, preview, and MapLibre worker build configuration |
| `worker/index.ts` | Cloudflare Worker entry point |
| `package.json` | Dependencies and commands |
| `package-lock.json` | Exact dependency versions; commit changes whenever dependencies change |
| `cloudflare-env.d.ts` | Type definitions for the runtime bindings |

Never commit `.env` files, setup keys, passwords, source credentials, database exports containing personal data, or uploaded evidence.

## Tests

| File | What it checks |
| --- | --- |
| `tests/rendered-html.test.mjs` | Product metadata, hosting bindings, and H3/map source contract |
| `tests/report-analytics.test.mjs` | Date filtering, complaint counts, category/search filtering, and empty trends |
| `tests/ui-components.test.mjs` | Shared interface component behaviour and generated CSS |

Useful commands:

```text
npm run install:ci
npm run build
npm test
npm run lint
```

## Suggested team reading order

1. Everyone: `README.md`, then this guide.
2. Frontend members: `app/page.tsx`, `components/city-dashboard.tsx`, `components/intelligence-map.tsx`, and `app/globals.css`.
3. Backend members: `app/api/complaints/route.ts`, `app/api/dashboard/route.ts`, and `lib/civic.ts`.
4. Database member: `db/schema.ts`, then the four SQL migrations in order.
5. Geo/AI member: `lib/geo.ts`, `lib/civic.ts`, and `lib/report-analytics.ts`.
6. Security/auth member: `app/chatgpt-auth.ts`, `lib/authz.ts`, and every write API's role check.
7. Everyone together: trace one report from the form to D1, the H3 hotspot, analytics, and the admin/organization workflow.

## Good SIH code-review questions

- Which values come directly from citizen input, and where are they validated?
- How does one report receive its category, severity, coordinates, and H3 cell?
- When does CIVIQ update an existing hotspot instead of creating a new one?
- Which API endpoints are public, signed-in, organization-only, or admin-only?
- Which dashboard figures use recorded complaints and which zones are seeded demonstration data?
- What happens when GPS, the basemap, D1, R2, or analytics is unavailable?
- Which proposed AI features still need a model, training/evaluation data, and measurable accuracy?
