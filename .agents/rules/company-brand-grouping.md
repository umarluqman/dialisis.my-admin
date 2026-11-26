---
trigger: model_decision
description: "dialisis.my centers grouped into brands (Company table, /rangkaian pages); seed rules live in gitignored scripts/seed-companies.js in dialisis.my"
---

# Company Brand Grouping

On 2026-09-17 centers were grouped into 105 brands (477 of 961 centers) via `Company` rows on Turso and `DialysisCenter.companyId`. Public pages: `/rangkaian` (index) and `/rangkaian/[slug]` (branches grouped by state). Center detail shows `"Cawangan lain"` siblings.

**Why:** one operator (DaVita, NKF, KPJ, Mukmin, Harmoni…) runs many branches; a per-brand grouping gives operators and admins one place to monitor a chain.

**How to apply:** grouping rules are regex-per-brand in `dialisis.my/scripts/seed-companies.js` (gitignored dir). Dry run writes `data/company-assignments.json`; `--apply` upserts. Only brands with ≥2 matches are seeded. Regexes must use `dial[iy]sis` / `ha?e?modial[iy]sis` to catch spelling variants. To add a center to a brand: `node scripts/manage-company.js assign "<Company name>" <slug>`.

**Review checklist (2026-09-17):** `dialisis.my/docs/company-merge-checklist.md` — 14 splits, ~11 adds, 16 new brands. Key verified facts: Suria = Kumar Urology & Stone Centre Sdn Bhd (18 branches); Harmoni KL = Harmoni Dialysis Sdn Bhd ≠ Medinique; Nephrocare Global = Caring Synergy, Nephrocare Management separate; Renal-Link Papar/Penang = B. Braun; Mukmin operator Gedung Penawar also runs Mustapha Kamal/Fazwinna/Felina/etc.
