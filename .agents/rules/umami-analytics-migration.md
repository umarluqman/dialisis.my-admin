---
trigger: model_decision
description: "Umami dropped for PIC stats; per-center views+clicks live in Turso DB; local testing must override TURSO_DATABASE_URL"
---

# Analytics & Turso Architecture

Umami was dropped for PIC dashboards so everything uses Turso as a single source of truth:
- `CenterView` table (one row per visitor per center per MYT day, same `visitorKey` as `ContactClick`), `/api/center-views` beacon, and public PIC dashboard `/dashboard/[token]` (`Company.dashboardToken`).
- Admin UI lives in `~/side-projects/dialisis-admin` (`admin.dialisis.my`, TanStack Start on Cloudflare, deploy via `pnpm run deploy` from `main`).
- Lead quality rules (`LEAD_FIX_AT`, test detection, duplicate key) live in `src/lib/lead-quality.ts`.

**How to apply:** local testing must override `TURSO_DATABASE_URL=file:...` — `.env.local` in `dialisis.my` points at prod Turso. Raw SQL relies on Prisma libsql's ISO text DateTime format.
