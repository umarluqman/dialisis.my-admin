---
trigger: model_decision
description: "PIC premium plans — Pro RM149 (EB 99), Pilihan Bandar RM199 (EB 149); state slot removed; no % per lead (Act 586 fee-splitting)"
---

# Premium Plans Pricing

Live prices (`dialisis.my/src/app/(ms)/untuk-pusat-dialisis/pricing.ts`):
- **Pro**: RM149/mo (earlybird RM99) — profile extras only (photos, FAQ, benefits).
- **Pilihan Bandar**: RM199/mo (earlybird RM149) — 1 featured centre per town, 30 earlybird seats.
- **Pilihan Negeri** (RM299) removed 2026-10-10 (state too big a search area).

Rules & constraints:
- **Leads are free** for every claimed centre on any plan (2026-11-11). Never charge % of patient revenue per lead (Act 586 s.83 fee-splitting/inducement ban, MMC Code 2019, MOH enforcement May 2026) — flat fees only.
- **Positioning**: sell visibility, complete profile, analytics. Never promise lead, booking, or patient numbers.
- **Accepted price range** from PIC interviews: RM100–300/month.
- **Rangkaian (chains)**: 2–4 centres = public 15% off from 2nd centre; 5+ = custom quote (`"hubungi kami"`).
- Do not use prices from older `docs/plans/dialysis-chain-offer-plan.md` (Feb 2026).

Related: `company-brand-grouping.md`, `pay-per-lead-pilot.md`, `lead-data-not-baseline.md`.
