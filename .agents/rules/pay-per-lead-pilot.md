---
trigger: model_decision
description: "Lead routing & billing — claimed centres get leads straight to PICs; Asas billed RM150/verified lead (upfront consent), Pilihan Bandar & Rangkaian RM0 lead fees; unclaimed → team"
---

# Lead Routing & Billing

Updated 2026-11-25 (`dialisis.my/src/app/(ms)/untuk-pusat-dialisis/pricing.ts`):
- **Claimed centre** (has a `user_center_access` PIC): lead is emailed straight to PIC(s) and visible in admin leads/follow-up tabs on any plan (never gate lead visibility on plan).
- **Billing**:
  - **Asas**: flat **RM150/verified lead** monthly digital-marketing fee (with upfront HQ consent; duplicates, fake numbers, and spam are RM0).
  - **Pilihan Bandar** & **Rangkaian**: **RM0 lead fees** for the plan duration.
- **Unclaimed centre**: lead still goes to team (`LEAD_ADMIN_EMAILS`) rather than emailing the scraped centre address.
- **Claiming**: stays manual via WhatsApp + superadmin invitation.
- **MOH/gov**: still no booking form.

**How to apply:** never gate lead visibility on plan in admin; never charge % of patient revenue (Act 586); never promise lead/patient numbers. Related: `premium-plans-pricing.md`, `lead-data-not-baseline.md`.
