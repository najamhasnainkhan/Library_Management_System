import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../auth.js";
import { ensureFines } from "../fines.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res, next) => {
  try {
    await ensureFines();
    const [books, borrowed, members, overdue, recent, extra] = await Promise.all([
      query(
        `select count(*)::int as titles,
                coalesce(sum(total_copies),0)::int as total,
                coalesce(sum(available_copies),0)::int as available
         from books`
      ),
      query("select count(*)::int as n from loans where returned_at is null"),
      query("select count(*)::int as n from members"),
      query("select count(*)::int as n from loans where returned_at is null and due_at < now()"),
      query(
        `select l.id, b.title, m.name as member, l.issued_at, l.due_at, l.returned_at
         from loans l join books b on b.id = l.book_id join members m on m.id = l.member_id
         order by l.issued_at desc limit 5`
      ),
      query(
        `select (select count(*)::int from reservations where status in ('pending','ready')) as reservations,
                (select coalesce(sum(amount),0)::float from fines where not paid) as unpaid_fines`
      ),
    ]);
    res.json({
      totalBooks: books.rows[0].total,
      bookTitles: books.rows[0].titles,
      availableBooks: books.rows[0].available,
      borrowedBooks: borrowed.rows[0].n,
      members: members.rows[0].n,
      overdue: overdue.rows[0].n,
      reservations: extra.rows[0].reservations,
      unpaidFines: extra.rows[0].unpaid_fines,
      recentLoans: recent.rows,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
