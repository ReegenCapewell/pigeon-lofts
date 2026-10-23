# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Pigeon Lofts Manager ("LoftTracker"): a small Next.js 16 (App Router, React 19, React Compiler enabled) app for managing racing pigeon lofts and birds. Postgres via Prisma 6, credentials auth via NextAuth v4 (JWT sessions), Tailwind v4. Deployed on Vercel.

## Commands

```bash
npm run dev        # next dev --webpack (Turbopack is deliberately disabled)
npm run build      # next build
npm run lint       # eslint (flat config, eslint-config-next)
npx prisma migrate dev --name <name>   # create/apply a migration after editing prisma/schema.prisma
npx prisma generate                    # also runs automatically on npm install (postinstall)
```

There is no test suite.

Env vars: `DATABASE_URL` (in `.env`, read by Prisma CLI) and `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `DATABASE_URL` (in `.env.local`, read by Next).

`prisma.config.disabled` is an intentionally disabled `prisma.config.ts`; recent commits were fixing Prisma generation/deploy issues, so don't re-enable it casually. Prisma reads `prisma/schema.prisma` by default.

## Architecture

**Data model** (`prisma/schema.prisma`): `User` → many `Loft`, `User` → many `Bird`; `Bird.loftId` is optional (a bird can be unassigned). `Bird.ring` is unique among non-deleted birds only, enforced by a partial unique index (`Bird_ring_active_unique`) created in raw SQL in migration `20260314000001_ring_partial_unique`. Prisma's schema can't express this index, so check any `prisma migrate dev` output and don't let it generate a migration that drops the index. `Bird.dateOfBirth` is required when creating a bird via `POST /api/birds` (sent as `dd/mm/yyyy`, must not be in the future) but nullable in the DB.

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

**Ring numbers**: always pass through `normaliseRing` and `isValidRing` in `src/lib/validation.ts` (uppercase, no spaces, `AA00[A]0000`). Duplicate rings surface as Prisma error `P2002` → 409.

**UI**: `src/app/layout.tsx` wraps everything in `AuthProvider` (SessionProvider) and `AppShell` (header/nav/footer, hidden on `/auth`), inside `ThemeProvider` (`src/components/ThemeProvider.tsx`). Light/dark mode is class-based: a `.dark` class on `<html>`, persisted in `localStorage.theme`, set before first paint by an inline script in `layout.tsx`. `globals.css` defines the `dark:` variant via `@custom-variant`. Style with both light and `dark:` utilities. Shared UI pieces: `ConfirmModal`, `InlineError`, `ListSkeleton`/`Skeleton`.
