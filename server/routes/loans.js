import { Router } from "express";
import { query, withTransaction } from "../db.js";
import { requireAuth } from "../auth.js";
import { FINE_PER_DAY, LOAN_DAYS, MAX_ACTIVE_LOANS, MAX_RENEWALS } from "../config.js";
import { daysLate, settleLoanFine } from "../fines.js";
import { promoteReservations, readyCount } from "../holds.js";

const router = Router();
router.use(requireAuth);

/** Throw an error that the global handler turns into a clean JSON message. */
const fail = (status, message) => Object.assign(new Error(message), { status });
const parseId = (v) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw fail(400, "Invalid id");
  return n;
};

const SELECT = `select l.id, l.book_id, l.member_id, l.issued_at, l.due_at, l.returned_at, l.renewals,
  b.title, b.author, b.isbn, m.name as member_name, m.member_number,
  case when l.returned_at is not null then 'returned' when l.due_at < now() then 'overdue' else 'borrowed' end as state,
  ${daysLate("l")} as days_late,
  case when l.returned_at is null then (${daysLate("l")} * ${Number(FINE_PER_DAY)})::float
       else coalesce(f.amount, 0)::float end as fine,
  coalesce(f.paid, false) as fine_paid
  from loans l
  join books b on b.id = l.book_id
  join members m on m.id = l.member_id
  left join fines f on f.loan_id = l.id`;

const RULES = { loan_days: LOAN_DAYS, max_renewals: MAX_RENEWALS, fine_per_day: FINE_PER_DAY, max_active_loans: MAX_ACTIVE_LOANS };

router.get("/", async (req, res, next) => {
  try {
    const state = String(req.query.state || "open");
    const q = String(req.query.q || "").trim();
    const where = [];
    const params = [];
    if (state === "open") where.push("l.returned_at is null");
    else if (state === "overdue") where.push("l.returned_at is null and l.due_at < now()");
    else if (state === "returned") where.push("l.returned_at is not null");
    if (q) {
      params.push(`%${q.replace(/[\\%_]/g, "\\$&")}%`);
      where.push(`(b.title ilike $1 or b.isbn ilike $1 or m.name ilike $1 or m.member_number ilike $1)`);
    }
    const order = state === "returned" ? "l.returned_at desc" : "l.due_at asc";
    const { rows } = await query(
      `${SELECT} ${where.length ? "where " + where.join(" and ") : ""} order by ${order}, l.id desc limit 500`,
      params
    );
    res.json({ loans: rows, rules: RULES });
  } catch (err) {
    next(err);
  }
});

/** Issue a book: due date is today + LOAN_DAYS. */
router.post("/", async (req, res, next) => {
  try {
    const bookId = parseId(req.body?.book_id);
    const memberId = parseId(req.body?.member_id);
    const id = await withTransaction(async (c) => {
      const book = (await c.query("select id, title, available_copies from books where id = $1 for update", [bookId])).rows[0];
      if (!book) throw fail(404, "Book not found");
      const member = (await c.query("select id, name, status from members where id = $1", [memberId])).rows[0];
      if (!member) throw fail(404, "Member not found");
      if (member.status !== "active") throw fail(409, `${member.name} is suspended and cannot borrow books`);

      const stats = (
        await c.query(
          `select count(*)::int as open,
                  count(*) filter (where due_at < now())::int as overdue,
                  count(*) filter (where book_id = $2)::int as same_book
           from loans where member_id = $1 and returned_at is null`,
          [memberId, bookId]
        )
      ).rows[0];
      if (stats.same_book > 0) throw fail(409, `${member.name} already has a copy of this book on loan`);
      if (stats.overdue > 0) throw fail(409, `${member.name} has overdue books. They must be returned before borrowing more.`);
      if (stats.open >= MAX_ACTIVE_LOANS) throw fail(409, `${member.name} already has the maximum of ${MAX_ACTIVE_LOANS} books on loan`);

      const heldForOthers = await readyCount(c, bookId, memberId);
      if (book.available_copies - heldForOthers <= 0) {
        throw fail(409, book.available_copies > 0
          ? "The remaining copies are held for members who reserved them"
          : "No copies are available. You can reserve this book instead.");
      }

      await c.query("update books set available_copies = available_copies - 1 where id = $1", [bookId]);
      const loan = await c.query(
        `insert into loans (book_id, member_id, issued_by, due_at)
         values ($1, $2, $3, now() + make_interval(days => $4)) returning id`,
        [bookId, memberId, req.user.id, LOAN_DAYS]
      );
      // Borrowing a reserved book fulfils the member's reservation.
      await c.query(
        "update reservations set status = 'fulfilled' where book_id = $1 and member_id = $2 and status in ('pending','ready')",
        [bookId, memberId]
      );
      return loan.rows[0].id;
    });
    const { rows } = await query(`${SELECT} where l.id = $1`, [id]);
    res.status(201).json({ loan: rows[0] });
  } catch (err) {
    next(err);
  }
});

/** Record a return; late returns get their final fine. */
router.post("/:id/return", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const fine = await withTransaction(async (c) => {
      const loan = (await c.query("select id, book_id, returned_at from loans where id = $1 for update", [id])).rows[0];
      if (!loan) throw fail(404, "Loan not found");
      if (loan.returned_at) throw fail(409, "This book has already been returned");
      await c.query("select id from books where id = $1 for update", [loan.book_id]);
      await c.query("update loans set returned_at = now() where id = $1", [id]);
      await c.query("update books set available_copies = least(total_copies, available_copies + 1) where id = $1", [loan.book_id]);
      const amount = await settleLoanFine(c, id);
      await promoteReservations(c, loan.book_id);
      return amount;
    });
    const { rows } = await query(`${SELECT} where l.id = $1`, [id]);
    res.json({ loan: rows[0], fine });
  } catch (err) {
    next(err);
  }
});

/** Renew: extends the current due date by LOAN_DAYS, up to MAX_RENEWALS times. */
router.post("/:id/renew", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    await withTransaction(async (c) => {
      const loan = (
        await c.query("select id, book_id, member_id, returned_at, renewals, due_at < now() as late from loans where id = $1 for update", [id])
      ).rows[0];
      if (!loan) throw fail(404, "Loan not found");
      if (loan.returned_at) throw fail(409, "This book has already been returned");
      if (loan.late) throw fail(409, "Overdue loans cannot be renewed. Record the return instead.");
      if (loan.renewals >= MAX_RENEWALS) throw fail(409, `This loan has already been renewed ${MAX_RENEWALS} times`);
      const waiting = await c.query(
        "select count(*)::int as n from reservations where book_id = $1 and member_id <> $2 and status in ('pending','ready')",
        [loan.book_id, loan.member_id]
      );
      if (waiting.rows[0].n > 0) throw fail(409, "Another member has reserved this book, so it cannot be renewed");
      await c.query(
        "update loans set due_at = due_at + make_interval(days => $2), renewals = renewals + 1 where id = $1",
        [id, LOAN_DAYS]
      );
    });
    const { rows } = await query(`${SELECT} where l.id = $1`, [id]);
    res.json({ loan: rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
