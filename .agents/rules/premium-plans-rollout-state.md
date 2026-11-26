---
trigger: model_decision
description: "Premium-plans schema live in prod Turso and admin deployed; always check prod schema before admin deploys"
---

# Premium Plans Rollout State

Prod Turso has migration `20260927000000_add_premium_plans`: `plan`/`earlybird`/`verifiedAt`/`fees`/etc. columns, `FeaturedSlot`, `FeaturedEvent`, `LocationView`. Admin GitHub remote is `umarluqman/dialisis.my-admin`.

**How to apply:** before deploying admin schema-dependent code, check prod tables/columns first — `src/db/ensure-schema.ts` only creates admin-owned tables/columns, not Prisma-owned ones. Related: `premium-plans-pricing.md`, `destructive-migrations-two-deploys.md`.
