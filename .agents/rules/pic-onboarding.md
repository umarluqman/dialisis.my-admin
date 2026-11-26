---
trigger: model_decision
description: "PIC onboarding (welcome modal + setup checklist) live on admin.dialisis.my; flags on admin user table"
---

# PIC Onboarding

Deployed 2026-11-13 (commit `07c76ad`, followed by `166bc38` unlocking leads/follow-up for all claimed centres). Welcome walkthrough shows once per user (`user.onboarding_seen_at`); setup checklist (profile complete, verified, PIC WhatsApp number) hides when all done or dismissed (`user.onboarding_dismissed_at`).

Columns are added by admin `ensure-schema.ts`, not Prisma. Shown to role `pic` including superadmin preview (preview writes superadmin's own flags).

**How to apply:** to re-show for a user, null `onboarding_seen_at` and `onboarding_dismissed_at`. Related: `pay-per-lead-pilot.md`, `admin-deploy-accounts.md`.
