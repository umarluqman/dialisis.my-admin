---
trigger: model_decision
description: "dialisis.my prod:build auto-applies Prisma migrations to Turso before new code is live; drop-column migrations must ship in a later deploy"
---

# Destructive Migrations Need Two Deploys

Amplify `prod:build` in `dialisis.my` runs `scripts/migrate-turso.js` (applies `prisma/migrations` to prod Turso) before `next build`, so the DB changes while the old code is still serving.

On 2026-10-01, committing a `DROP COLUMN` migration together with the code that stopped reading the columns caused old live code to 500 on centre pages for ~35 min until the nullable columns were re-added.

**How to apply:** additive migrations can ship with code. For `DROP`/`RENAME`: deploy code that stops using the column first (including `dialisis-admin` on Cloudflare/Drizzle), and only add or run the drop migration after that deploy is confirmed live. Related: `premium-plans-rollout-state.md`.
