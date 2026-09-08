# CIVIQ — Urban Intelligence Layer

CIVIQ turns authenticated citizen reports into prioritized city hotspots and connects verified organizations with issues they can investigate.

## Live architecture

- **Web application:** Vinext / React deployed with ChatGPT Sites
- **Authentication:** Sign in with ChatGPT, handled by the Sites dispatcher
- **Authorization:** server-side CIVIQ roles in D1 (`citizen`, `organization_pending`, `organization`, `admin`)
- **Database:** Cloudflare D1 through the logical `DB` binding
- **Evidence files:** Cloudflare R2 through the logical `BUCKET` binding
- **Map:** MapLibre GL JS with a low-volume OpenStreetMap development basemap
- **Geographic clustering:** H3 resolution 8 cells generated server-side for every hotspot and report
- **Source identity:** `.openai/hosting.json` contains the opaque Sites project ID and binding names

No CIVIQ password is stored. The platform provides a stable per-Site user ID, while CIVIQ controls what that identity may do.

## Current dashboard and geographic flow

1. A citizen types an area and can optionally attach their browser GPS position.
2. The API validates the coordinates or resolves the typed Delhi area to a stable point.
3. H3 converts that point into a resolution 8 cell ID.
4. Reports in the same category and H3 cell update one hotspot instead of creating another zone marker.
5. The dashboard renders the H3 boundary as an interactive polygon and exposes the zone ID in the owner dashboard.
6. Time filters and trend charts count recorded complaint rows; seeded demonstration totals are excluded from those analytics.

For a file-by-file explanation and team reading plan, see [`CODEBASE_GUIDE.md`](CODEBASE_GUIDE.md).

Typed-location fallback keeps the demo deterministic when a citizen declines location permission. GPS is never requested until the citizen chooses **Use my GPS**.

## Access model

| Surface or action | Anonymous | Citizen | Pending organization | Verified organization | Admin |
| --- | ---: | ---: | ---: | ---: | ---: |
| View city map and hotspots | Yes | Yes | Yes | Yes | Yes |
| Submit and track own reports | No | Yes | Yes | Yes | Yes |
| Upload evidence | No | Yes | Yes | Yes | Yes |
| Investigate/adopt an issue | No | No | No | Yes | Yes |
| Open `/admin` controls | No | No | No | No | Yes |
| Approve organizations and change zone status | No | No | No | No | Yes |

## First owner setup

1. Set the production `ADMIN_SETUP_TOKEN` as a secret in Sites.
2. Deploy the version containing the role and admin migrations.
3. Visit `/admin` and choose **Sign in with ChatGPT**.
4. Enter the one-time owner setup key.
5. The signed-in per-Site user ID becomes the sole CIVIQ administrator.

The setup key is only a bootstrap secret. Daily owner access uses Sign in with ChatGPT. Never commit the key to Git.

## Organization onboarding

1. A user signs in and opens `/account`.
2. They submit organization name, expertise, and operating region.
3. Their role becomes `organization_pending`.
4. The owner reviews the application in `/admin`.
5. Approval changes the role to `organization`, enabling investigate/adopt actions.

## Important routes

- `/` — public intelligence map and authenticated citizen/organization workspace
- `/account` — protected account and organization application page
- `/admin` — protected owner dashboard and one-time owner claim
- `/api/dashboard` — public map data plus the signed-in user's own reports
- `/api/complaints` — authenticated report creation, coordinate validation, and H3 assignment
- `/api/evidence` — authenticated upload and opaque-key retrieval
- `/api/organizations/apply` — authenticated organization application
- `/api/hotspots/[id]/adopt` — verified organization/admin action
- `/api/admin/*` — administrator-only data and mutation endpoints

## Local commands

- `npm run install:ci` — install the locked dependency tree
- `npm run lint` — lint application code
- `npm test` — build and run the tests
- `npm run db:generate` — generate Drizzle migrations after schema changes

## Ownership notes

The Site owner controls publication and access through their ChatGPT account. D1 and R2 are managed Sites resources, so there is no separate database password or R2 access key to hand over. For infrastructure that is portable outside Sites, migrate the same schema and objects to a user-owned Cloudflare or Supabase account and update the server adapters.
