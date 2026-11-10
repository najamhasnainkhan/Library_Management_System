import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../auth.js";
import { ensureFines } from "../fines.js";
import { FINE_PER_DAY } from "../config.js";

const router = Router();
router.use(requireAuth);

const parseId = (v) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw Object.assign(new Error("Invalid id"), { status: 400 });
  return n;
};

const SELECT = `select f.id, f.loan_id, f.member_id, f.amount::float as amount, f.paid, f.paid_at, f.created_at,
  m.name as member_name, m.member_number, b.title, l.due_at, l.returned_at
  from fines f join members m on m.id = f.member_id
  join loans l on l.id = f.loan_id join books b on b.id = l.book_id`;

router.get("/", async (req, res, next) => {
  try {
    await ensureFines();
    const status = String(req.query.status || "unpaid");
    const memberId = req.query.member_id ? parseId(req.query.member_id) : null;
    const where = ["f.amount > 0"];
    const params = [];
    if (status === "unpaid") where.push("not f.paid");
    if (status === "paid") where.push("f.paid");
    if (memberId) {
      params.push(memberId);
      where.push(`f.member_id = $${params.length}`);
    }
    const { rows } = await query(`${SELECT} where ${where.join(" and ")} order by f.paid, f.created_at desc, f.id desc limit 500`, params);
    const totals = await query(
      `select coalesce(sum(amount) filter (where not paid), 0)::float as unpaid,
              coalesce(sum(amount) filter (where paid), 0)::float as collected,
              count(distinct member_id) filter (where not paid and amount > 0)::int as members_owing
       from fines`
    );
    res.json({ fines: rows, totals: totals.rows[0], fine_per_day: FINE_PER_DAY });
  } catch (err) {
    next(err);
  }
});

/** Mark a fine as paid. Fines on books still out stop growing once paid only after return, so require a return first. */
router.post("/:id/pay", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    await ensureFines(true);
    const f = (
      await query("select f.id, f.paid, l.returned_at from fines f join loans l on l.id = f.loan_id where f.id = $1", [id])
    ).rows[0];
    if (!f) return res.status(404).json({ error: "Fine not found" });
    if (f.paid) return res.status(409).json({ error: "This fine is already paid" });
    if (!f.returned_at) return res.status(409).json({ error: "Record the book's return first; the fine is final once it is returned" });
    await query("update fines set paid = true, paid_at = now() where id = $1 and not paid", [id]);
    const { rows } = await query(`${SELECT} where f.id = $1`, [id]);
    res.json({ fine: rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
