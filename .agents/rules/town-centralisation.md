---
trigger: model_decision
description: "Town table rollout — deploy 1 + backfill + admin 2a + site 2b shipped; 2c (admin Towns page) and deploy 3 (drop legacy town columns) remain; prod DB is dialisis-restore"
---

# Town Centralisation

Plan in `dialisis.my/docs/plans/town-centralisation.md`: one `Town` table shared by site + admin, centre `townId` FK, admin combobox, superadmin Towns page, 3-deploy rollout.

User values SEO + user value over strict geographic accuracy: town names follow GSC demand / ranking slugs (e.g. KL city centre = `"Bukit Bintang"`, Kemaman over Chukai); zero-centre ranking slugs stay as nearest-centre pages (indexed if nearest centre ≤20 km).

Status (2026-10-27):
- `Town` table live and backfilled on prod (**`dialisis-restore`** is the prod Turso DB, not `dialisis`); snapshot `town-backfill-snap-20261027` kept for rollback.
- Admin 2a deployed (combobox writes `townId`).
- Site 2b pushed (`9210ca03`): pages/redirects/sitemap/finder read from `Town`.
- Remaining: 2c admin Towns page (rename/merge appends `redirectFrom`), deploy 3 drop `DialysisCenter.town` + `FeaturedSlot.town` only after 2b is confirmed live. `hospital-pitas` sector was wiped (needs manual fix).

Related: `destructive-migrations-two-deploys.md`.
