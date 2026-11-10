import { Router } from "express";
import { query, withTransaction } from "../db.js";
import { requireAuth } from "../auth.js";
import { promoteReservations } from "../holds.js";

const router = Router();
router.use(requireAuth);

const fail = (status, message) => Object.assign(new Error(message), { status });
const parseId = (v) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw fail(400, "Invalid id");
  return n;
};

const SELECT = `select r.id, r.book_id, r.member_id, r.status, r.created_at,
  b.title, b.author, b.available_copies, m.name as member_name, m.member_number,
  (select count(*)::int from reservations r2 where r2.book_id = r.book_id and r2.status = 'pending'
     and (r2.created_at, r2.id) <= (r.created_at, r.id)) as queue_position
  from reservations r join books b on b.id = r.book_id join members m on m.id = r.member_id`;

router.get("/", async (req, res, next) => {
  try {
    const status = String(req.query.status || "active");
    const where = status === "active" ? "where r.status in ('pending','ready')" : status === "all" ? "" : "where r.status = $1";
    const params = status === "active" || status === "all" ? [] : [status];
    const { rows } = await query(`${SELECT} ${where} order by r.created_at desc, r.id desc limit 300`, params);
    res.json({ reservations: rows });
  } catch (err) {
    next(err);
  }
});

/** Reserve a book that has no free copies. */
router.post("/", async (req, res, next) => {
  try {
    const bookId = parseId(req.body?.book_id);
    const memberId = parseId(req.body?.member_id);
    const id = await withTransaction(async (c) => {
      const book = (await c.query("select id, available_copies from books where id = $1 for update", [bookId])).rows[0];
      if (!book) throw fail(404, "Book not found");
      const member = (await c.query("select name, status from members where id = $1", [memberId])).rows[0];
      if (!member) throw fail(404, "Member not found");
      if (member.status !== "active") throw fail(409, `${member.name} is suspended and cannot reserve books`);
      const onLoan = await c.query("select 1 from loans where book_id = $1 and member_id = $2 and returned_at is null", [bookId, memberId]);
      if (onLoan.rowCount) throw fail(409, `${member.name} already has this book on loan`);
      const held = await c.query(
        "select 1 from reservations where book_id = $1 and member_id = $2 and status in ('pending','ready')",
        [bookId, memberId]
      );
      if (held.rowCount) throw fail(409, `${member.name} already has an active reservation for this book`);
      const { rows } = await c.query(
        "insert into reservations (book_id, member_id) values ($1, $2) returning id",
        [bookId, memberId]
      );
      // If a copy is free and nobody is ahead, it is ready straight away.
      await promoteReservations(c, bookId);
      return rows[0].id;
    });
    const { rows } = await query(`${SELECT} where r.id = $1`, [id]);
    res.status(201).json({ reservation: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/cancel", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    await withTransaction(async (c) => {
      const r = (await c.query("select id, book_id, status from reservations where id = $1 for update", [id])).rows[0];
      if (!r) throw fail(404, "Reservation not found");
      if (!["pending", "ready"].includes(r.status)) throw fail(409, "This reservation is no longer active");
      await c.query("update reservations set status = 'cancelled' where id = $1", [id]);
      // A released held copy goes to the next person in the queue.
      await promoteReservations(c, r.book_id);
    });
    const { rows } = await query(`${SELECT} where r.id = $1`, [id]);
    res.json({ reservation: rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
