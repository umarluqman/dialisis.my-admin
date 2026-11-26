---
trigger: model_decision
description: "Leads are free for every claimed centre (any plan), sent straight to PIC; pay-per-lead pilot dropped"
---

# Leads Free for Claimed Centres

Decision (2026-11-11): lead intake is free for PICs to remove the team's manual lead handling. Replaces the 2026-10-23 pay-per-lead pilot and the earlier `"leads = Pro feature"`.

- Claimed centre (has a `user_center_access` PIC), any plan: lead emailed straight to PIC(s) + visible in admin leads/follow-up tabs.
- Unclaimed centre: lead still goes to team (`LEAD_ADMIN_EMAILS`) rather than emailing the scraped centre address.
- Claiming stays manual via WhatsApp + superadmin invitation (no self-serve OTP claim for now).
- Pro = profile extras only (photos, FAQ, benefits); Pilihan Bandar = featured slot.
- MOH/gov: still no booking form.

**Why:** free leads are the hook to get PICs to claim (only 6 of ~935 private/NGO centres were claimed on 2026-11-11).
**How to apply:** never gate leads on plan in site or admin; copy says leads are free after claiming. Never promise lead/patient numbers. Related: `premium-plans-pricing.md`, `lead-data-not-baseline.md`.
