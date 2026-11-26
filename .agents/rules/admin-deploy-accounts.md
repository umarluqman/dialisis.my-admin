---
trigger: model_decision
description: "dialisis-admin deploy = `pnpm run deploy` (wrangler); gh + wrangler often flip to komugo account, causing 403/auth errors"
---

# Admin Deploy Accounts

`dialisis-admin` (`~/side-projects/dialisis-admin`, branch `main`) deploys with `pnpm run deploy` (`vite build && wrangler deploy` to worker `admin`, `admin.dialisis.my`). Pushing to `main` does not deploy.

`gh` CLI and `wrangler` are both also logged in as the `komugo` / `komugohq@gmail.com` account, and something keeps switching the active one back. Symptoms: `git push` 403 `"denied to komugo"`; wrangler `"Authentication error [code: 10000]"`.

**How to apply:** before push/deploy check `gh auth status` (fix with `gh auth switch -u umarluqman`) and `npx wrangler whoami`. Wrangler needs the user to run `npx wrangler login` (interactive). Related: `premium-plans-rollout-state.md`.
