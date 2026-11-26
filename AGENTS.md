# dialisis-admin (`admin.dialisis.my`)

Admin and PIC dashboard for `dialisis.my`. TanStack Start full-stack React 19 app deployed on Cloudflare Workers, sharing the prod Turso SQLite database (`dialisis-restore`) with the `dialisis.my` public site.

## Commands

- `pnpm dev` — Start development server on port 3001
- `pnpm build` — Build for production (`vite build`)
- `pnpm run deploy` — Build and deploy to Cloudflare Worker `admin` (`admin.dialisis.my`). Pushing to `main` does **not** deploy.
- `pnpm serve` — Preview production build
- `npx vitest run src` — Run unit tests (Playwright specs live in `e2e/` and run via `pnpm test:e2e`)
- `pnpx shadcn@latest add <component>` — Add Shadcn components (`new-york` style, Zinc base, CSS variables)

## Architecture

- **Routing**: TanStack Router file-based routes in `src/routes/` (auto-generates `src/routeTree.gen.ts`). Dashboard pages are tabs on `/dashboard` (`src/routes/dashboard.tsx`).
- **Server functions & Queries**: TanStack Start `createServerFn` in `src/core/functions/`, paired with TanStack Query options in `src/components/dashboard/queries.ts`.
- **Database**: Drizzle ORM (`src/db/schema.ts`, `src/db/connection.ts`). `dialisis.my` owns shared core tables via Prisma; `src/db/ensure-schema.ts` only creates admin-owned tables/columns.
- **Styling**: Tailwind CSS v4 + Shadcn/Radix primitives in `src/components/ui/`. Path alias `@/*` maps to `src/*`.
- **TypeScript**: Strict mode (`noUnusedLocals`, `noUnusedParameters`).

## Core Invariants

- **Bilingual UI (EN default / BM)**: Every new user-visible UI string must live in the file's `COPY = defineCopy({ en, ms })` and be read via `useCopy(COPY)` (`src/lib/i18n.tsx`). Server error messages and emails stay English.
  - Established BM terms: Leads = `Permohonan temujanji`, lead statuses = `Baru / Dihubungi / Ditempah / Tidak sesuai`, featured = `Slot pilihan`, analytics contacts = `hubungan`, brand = `Jenama`, sales Pilot = `Percubaan`.
- **Leads are free for every claimed centre**: Never gate leads or follow-up on plan. Claimed centres (`user_center_access`) get leads directly on any plan; unclaimed centres fall back to the team. Pro = profile extras only; Pilihan Bandar = featured slot (no Pilihan Negeri). Never promise lead/patient numbers.
- **Lead quality rules**: Never quote raw `IntakeLead` or PIC opt-in counts as traction. Test lead detection, deduplication (`leadDuplicateKey`), and `LEAD_FIX_AT` live in `src/lib/lead-quality.ts`.
- **Shared DB safety**: Check prod Turso (`dialisis-restore`) schema before deploying schema-dependent code. Destructive changes (drop/rename shared columns) require two deploys after both `dialisis.my` and `dialisis-admin` stop reading them.
- **Deploy accounts**: `gh` and `wrangler` often flip to the `komugo` account. Check `gh auth status` (`gh auth switch -u umarluqman`) and `npx wrangler whoami` before pushing or deploying.

Detailed project context and historical decisions live as modular rules in `.agents/rules/`.
