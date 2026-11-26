---
trigger: model_decision
description: "dialisis-admin UI is bilingual EN (default) / BM; new UI text needs both via defineCopy"
---

# Admin i18n

Admin UI (`~/side-projects/dialisis-admin`) is bilingual EN (default) / BM. Locale is stored in the `locale` cookie and read in SSR; use `defineCopy` / `useCopy` from `src/lib/i18n.tsx` with one `COPY` per file. Server error messages and emails intentionally stay English.

Admin BM terms differ from the public site on purpose:
- Lead statuses are short to fit badges: `Baru` / `Dihubungi` / `Ditempah` / `Tidak sesuai` (public intake page uses `"Pesakit dihubungi"` / `"Temujanji disahkan"`).
- Leads = `"Permohonan temujanji"`
- Featured = `"Slot pilihan"`
- Brand = `"Jenama"`
- Analytics contacts = `"hubungan"`
- Sales Pilot = `"Percubaan"`

**How to apply:** any new admin UI string goes in the file's `COPY` with an `ms` entry (the types enforce it); reuse the terms above. Related: `umami-analytics-migration.md`.
