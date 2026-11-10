# Library Management System

Vite + React + Tailwind frontend, Express API, PostgreSQL.

**Phase 1 (this build):** JWT login with roles (admin / librarian), sidebar layout, dashboard statistics, admin-only staff accounts page. The database already holds the full data model (books, members, loans, reservations, fines, notifications) for later phases.

**Phase 2:** book catalog (add/edit/delete, categories, search by title/author/ISBN/publisher, filter by category and availability) and members (register, edit profile, suspend, searchable list, profile page with borrowing history and unpaid fines).

**Phase 3:** circulation. Issue books (due in 14 days), record returns, renew up to 2 times, reserve books with no free copies (queue; the first in line gets a held copy when one is returned), live status per book (available / borrowed / reserved / overdue), automatic fines (0.50 per late day, finalised on return) with unpaid balances on the Fines page, member profiles and the dashboard. Rules are configurable with `LOAN_DAYS`, `MAX_RENEWALS`, `FINE_PER_DAY`, `MAX_ACTIVE_LOANS`.

## Run

```
npm install
npm run dev
```

Set `DATABASE_URL` and `SESSION_SECRET` in the Secrets panel (see `.env.example`). On first start, if there are no users, demo data is created:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@library.test | Admin123! |
| Librarian | librarian@library.test | Librarian123! |

Change the defaults with `SEED_ADMIN_PASSWORD` / `SEED_LIBRARIAN_PASSWORD` before first start. Librarians get a "Administrators only" page at `/staff`, and the API returns 403 for `/api/users`.

## Notes
- Prisma was requested, but this environment manages the schema through migrations (`db/migrations/`) and queries with `pg`.
- Members with overdue books, a suspended status, or the maximum number of loans cannot borrow; overdue loans cannot be renewed; a book reserved by someone else cannot be renewed.
- Reservation-ready notices are saved in the `notifications` table; the notification bell (SSE) and reports arrive in the final phase.
