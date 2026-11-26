---
trigger: model_decision
description: "Prod IntakeLead / PIC WhatsApp data before 2026-09-24 fix + internal test bookings are not real demand baseline"
---

# Lead Data Not Baseline

Pre-fix prod `IntakeLead` rows (before `2026-09-24T11:12:55.000+00:00`, commit `63a63c20`) and internal test bookings / `whatsappPic*` opt-ins are NOT a valid demand baseline. Lead delivery had an error prior to the fix, and some early bookings were internal tests by the team.

**How to apply:** never quote raw lead counts or PIC opt-in counts as traction. Treat real lead baseline as starting after `LEAD_FIX_AT`, excluding test leads and deduplicating per `src/lib/lead-quality.ts`. Ask the user for a clean start date if needed. Related: `umami-analytics-migration.md`.
