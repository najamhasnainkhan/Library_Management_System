# AGENTS.md

## Stack
- Frontend: Vite + React 18 + TypeScript + Tailwind CSS 3, react-router-dom, lucide-react icons.
- Backend: Express (ESM JavaScript) in `server/`, `pg` for Postgres, `jsonwebtoken` + `bcryptjs` for auth.
- Database: PostgreSQL; schema lives only in `db/migrations/` (applied via the apply_migration tool).

## Conventions
- `src/` client: `pages/` one file per screen, `components/` shared UI, `api.ts` fetch wrapper (relative `/api`), `auth.tsx` auth context.
- `server/routes/<area>.js` one Express Router per area, mounted in `server/index.js` under `/api/<area>`.
- Protect routes with `requireAuth` and `requireRole("admin")` from `server/auth.js`. The user is re-read from the DB on each request.
- All SQL is parameterised via `query()` in `server/db.js` (retries once on connection errors).
- Styling: Tailwind utilities plus `.input`, `.btn`, `.btn-secondary`, `.card` in `src/index.css`.
- Every input has a visible label; icon-only buttons have aria-labels.

## Run
- `npm install`, `npm run dev` (Vite on PORT, API on API_PORT||3001, proxied at /api).
- `npm run build` type-checks and builds the client; `npm start` serves API + dist.
- `npm run seed` seeds demo data if the users table is empty (also happens on API start).
- Env: DATABASE_URL, SESSION_SECRET (see `.env.example`). Never commit secrets.

## Decisions
- Express + pg instead of NestJS/Prisma (platform supports Vite + Express; schema managed by migrations).
- JWT in httpOnly sameSite=lax cookie `lms_token`, 8h; login rate limited in memory.
- Roles: `admin` (staff management, reports) and `librarian` (circulation). Members are records, not login users.
- Planned defaults: fine 0.50/day after a 14-day loan, max 2 renewals; notifications via SSE with polling fallback.
- Tables already exist for books, categories, members, loans, reservations, fines, notifications; later phases add the routes/UI.
- Phase 3 added: `/api/loans` (list, issue, `:id/return`, `:id/renew`), `/api/reservations` (list, create, `:id/cancel`), `/api/fines` (list, `:id/pay`); pages Loans / Reservations / Fines; `CheckoutModal` + `Picker`. Rules live in `server/config.js` (env overridable). `server/fines.js` computes fines as whole days late x rate; `ensureFines()` (throttled 20s) upserts one fine row per overdue open loan, final amount is written on return; paid fines never change. `server/holds.js` promotes the oldest pending reservation to `ready` (holding a copy, writing a `notifications` row) on return/cancel. Multi-step writes use `withTransaction` in `server/db.js` with row locks on books/loans.
- Phase 2 added: `/api/books`, `/api/categories`, `/api/members` (admin + librarian), pages Books / Members / MemberProfile, shared `Modal`, `BookForm`, `MemberForm`, `CategoryManager`, `Badge`. Search is server-side (`q`, `category`, `availability`, `status` query params), debounced in the UI. Books/members with loan history cannot be deleted (members can be suspended instead).
