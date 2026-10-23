# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Pigeon Lofts Manager ("LoftTracker"): a small Next.js 16 (App Router, React 19, React Compiler enabled) app for managing racing pigeon lofts and birds. Postgres via Prisma 6, credentials auth via NextAuth v4 (JWT sessions), Tailwind v4. Deployed on Vercel.

## Commands

```bash
npm run dev        # next dev --webpack (Turbopack is deliberately disabled)
npm run build      # next build
npm run lint       # eslint (flat config, eslint-config-next)
npx prisma migrate deploy              # apply pending migrations to the database in DATABASE_URL (the live DB)
npx prisma generate                    # also runs automatically on npm install (postinstall)
```

There is no test suite. To exercise the app without touching the live database, run a throwaway local Postgres with `NODE_OPTIONS=--experimental-sqlite npx prisma dev --name <name>` (Node 22.11 needs the flag). Point `DATABASE_URL` at it with `&pgbouncer=true&connection_limit=1` (it allows only one connection), run `prisma migrate deploy`, then start `next dev` with that `DATABASE_URL`. If it stops accepting connections after hot reloads, restart both.

Env vars: `DATABASE_URL` (in `.env`, read by Prisma CLI) and `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `DATABASE_URL` (in `.env.local`, read by Next).

Migrations: `DATABASE_URL` points at the live production database, and `npm run build` does not run migrations. To change the schema, edit `prisma/schema.prisma`, hand-write `prisma/migrations/<timestamp>_<name>/migration.sql`, and run `npx prisma migrate deploy` before pushing code that uses the new columns. Don't use `prisma migrate dev`: it would try to drop the partial ring index (see below).

`prisma.config.disabled` is an intentionally disabled `prisma.config.ts`; recent commits were fixing Prisma generation/deploy issues, so don't re-enable it casually. Prisma reads `prisma/schema.prisma` by default.

## Architecture

**Data model** (`prisma/schema.prisma`): `User` → many `Loft`, `User` → many `Bird`; `Bird.loftId` is optional (a bird can be unassigned). `Bird.ring` is unique among non-deleted birds only, enforced by a partial unique index (`Bird_ring_active_unique`) created in raw SQL in migration `20260314000001_ring_partial_unique`. Prisma's schema can't express this index, so check any `prisma migrate dev` output and don't let it generate a migration that drops the index. `Bird.dateOfBirth` is required when creating or editing a bird but nullable in the DB (older birds may lack one). It's entered as `dd/mm/yyyy` and stored as UTC midnight: always use `parseDob` / `formatDob` / `formatAge` from `src/lib/dateOfBirth.ts` and never parse or format it with local-time `Date` methods. `Bird.sex` is an optional `Sex` enum (`MALE`/`FEMALE`, null = unknown); use `parseSex`/`SEX_LABELS` from `src/lib/sex.ts` and render it with `<SexIcon>` next to the ring number in bird lists.

**Soft deletes**: `Loft` and `Bird` have `deletedAt`. Every query must filter `deletedAt: null`, including nested includes (e.g. `birds: { where: { deletedAt: null } }`). Deleting a loft unassigns its birds (`loftId: null`) rather than deleting them; deleting a bird also clears its `loftId`.

**Ownership scoping**: every lookup is scoped by `ownerId: user.id` using `findFirst({ where: { id, ownerId, deletedAt: null } })`, never a bare `findUnique` by id. Return 404 for not-found/not-owned; 403 when a referenced loft is invalid.

**Auth flow**:
- `src/lib/authOptions.ts` exports `authOptions` (Credentials provider, zod-validated, calls `verifyUser` from `src/lib/auth.ts`). `src/app/api/auth/[...nextauth]/route.ts` must export only the GET/POST handlers (Next 16 rejects other exports from route files). Sign-in page is `/auth`; signup is `POST /api/signup` (bcrypt hash).
- The session only carries the email. Server code resolves the user via `getServerSession(authOptions)` → `prisma.user.findUnique({ where: { email: email.toLowerCase() } })`. This is repeated inline in most routes/pages; `src/lib/apiAuth.ts` has a `requireUser()` helper for the same thing that isn't widely used yet.
- `src/middleware.ts` redirects unauthenticated page requests to `/auth?next=...`. Its `matcher` only covers `/`, `/lofts/*`, `/birds/*`, so API routes must do their own session checks.
- The shared `PrismaClient` instance is exported from `src/lib/auth.ts` (import `prisma` from `@/lib/auth`).

**Pages vs API**:
- Detail pages (`lofts/[id]`, `birds/[id]`) are async server components with `export const dynamic = "force-dynamic"` that query Prisma directly. Dynamic `params` is a `Promise` and must be awaited (Next 16).
- Edit pages (`*/[id]/edit`) use server actions that call `prisma.*.update` directly.
- List pages (`lofts/page.tsx`, `birds/page.tsx`) and components in `src/components` are client components that call the JSON API with `fetch(..., { cache: "no-store" })`.
- API routes: `/api/lofts` (GET/POST/DELETE `?id=`), `/api/birds` (GET/POST/DELETE `?id=`), `/api/birds/assign` and `/api/birds/move` (POST `{ birdId, loftId | null }`). Error responses are inconsistent: some return plain text, some `{ error }` JSON.

**Ring numbers**: always pass through `normaliseRing` and `isValidRing` in `src/lib/validation.ts` (uppercase, spaces/dashes removed). The format follows RPRA: 2–4 letter prefix, 2-digit year, optional letter, 4–6 digits (e.g. `GB22T12345`; GB17N/GB17Z rings have 6 digits). Duplicate rings surface as Prisma error `P2002` → 409. Manually entered pedigree ancestors are normalised but not validated, since they're often foreign rings (`NL19-1234567`).

**Race results** (`RaceResult` model, `src/lib/races.ts`, `src/components/races/`, page `/birds/[id]/races`):
- Only the race point (`raceName`) and `raceDate` are required. The date uses the same UTC-midnight dd/mm/yyyy handling as date of birth, and must fall after the bird's DOB. Positions, birds competing and lofts are stored per level (`club*`, `fed*`, `open*`, where Open covers Combine/National). Distance is stored in yards, entered as miles plus yards; prize money is stored in pence.
- Flying time and velocity (yards per minute) are always calculated from `liberationTime`, `clockTime`, `clockDayOffset` and `distanceYards` (`flyingSeconds` / `velocityYpm`), never stored. Overnight races don't deduct hours of darkness.
- All validation lives in `parseRaceInput` (shared by POST `/api/races` and PATCH `/api/races/:id`). A PATCH with only `{ showOnPedigree }` just toggles that flag. `src/lib/races.ts` has no Prisma imports, so client components can use it; the Prisma select is in `src/lib/raceQueries.ts`.
- Pedigree link: results with `showOnPedigree` (on by default for a top-10 placing) are loaded with each loft bird in `loadTree`. They become `PedNode.results` lines via `pedigreeLine`, best placing first, and show in the boxes (up to 4 for inner generations, 1 for outer ones) and on the print sheet. Changing a bird's DOB to after one of its races is blocked by `checkBirdChange`.

**Pedigrees** (`PedigreeNode` model, `src/lib/pedigree.ts`, `src/components/pedigree/`):
- A pedigree is a graph, not a per-bird document. Each `PedigreeNode` has `sireId`/`damId` pointing at other nodes. A node either links to one of the owner's birds (`birdId`, unique, with ring/name/sex/DOB read from the `Bird`) or is a manually entered ancestor (`birdId` null, with ring/name/sex stored on the node). Linking a loft bird as a parent reuses that bird's node, so its whole ancestry is shared by all its offspring.
- A bird's node is created lazily by `ensureBirdNode` (when its pedigree page opens, or when it's linked as a parent). "Has a pedigree" means its node has a `sireId` or `damId` (`hasPedigree`). Birds without one are flagged with `<NoPedigreeBadge>` in lists, on the profile and on the home page.
- `loadTree` loads all the owner's nodes and returns everything reachable from the root, so the client navigates any depth without refetching. Slots are ahnentafel-numbered (1 = bird, 2p = sire, 2p+1 = dam) in `PedigreeGrid`. The sheet shows `PEDIGREE_GENERATIONS` (4) generations back, or 2 on phones.
- The same bird may appear more than once (line breeding is normal). Repeats are counted by `repeatCounts`, shown as a `×N` badge, highlighted together on hover, and printed as `(×N)`.
- Impossible parents are blocked by `checkParentLink` (a parent must be born before its offspring; an unsexed bird can't be both a sire and a dam). Linking an unsexed bird sets its sex to match the role. The bird edit page calls `checkBirdChange`, so a sex or date-of-birth edit can't contradict existing pedigrees. `findProblems` (client) lists any older data that breaks these rules in a banner on the pedigree page.
- The server must reject loops (`wouldCreateCycle`) and wrong-sex parents. Replacing or removing a parent calls `deleteOrphanedManualNode`, which deletes manual ancestors nothing else references. Loft-bird nodes are never deleted.
- APIs: `PATCH /api/pedigree/nodes/:id` (details; ring/name only for manual nodes), `POST`/`DELETE /api/pedigree/nodes/:id/parents` (`{ role, birdId }` or `{ role, manual }`; DELETE takes `?role=`), and `POST /api/pedigree/share` (`{ birdId, enabled }`).
- Sharing: `shareToken` on a bird's node enables the public read-only page `/p/[token]`. It's outside the middleware matcher, and `AppShell` hides the app menus there. Printing uses a separate `PrintSheet` (`hidden print:flex`) with A4 landscape `@page` rules in `globals.css`; the rest of the UI is marked `print:hidden`.

**UI**: `src/app/layout.tsx` wraps everything in `AuthProvider` (SessionProvider) and `AppShell` (header/nav/footer, hidden on `/auth`), inside `ThemeProvider` (`src/components/ThemeProvider.tsx`). Light/dark mode is class-based: a `.dark` class on `<html>`, persisted in `localStorage.theme`, set before first paint by an inline script in `layout.tsx`. `globals.css` defines the `dark:` variant via `@custom-variant`. Style with both light and `dark:` utilities. Shared UI pieces: `ConfirmModal`, `InlineError`, `ListSkeleton`/`Skeleton`.
