import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../auth.js";
import { ensureFines } from "../fines.js";

const router = Router();
router.use(requireAuth);

const bad = (res, message) => res.status(400).json({ error: message });

function parseMember(body = {}) {
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase() || null;
  const phone = String(body.phone || "").trim() || null;
  const address = String(body.address || "").trim() || null;
  const notes = String(body.notes || "").trim() || null;
  const status = body.status === "suspended" ? "suspended" : "active";
  if (!name) return { error: "Name is required" };
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email" };
  return { value: { name, email, phone, address, notes, status } };
}

const LIST = `select m.id, m.member_number, m.name, m.email, m.phone, m.status, m.joined_at,
  (select count(*)::int from loans l where l.member_id = m.id and l.returned_at is null) as active_loans,
  (select count(*)::int from loans l where l.member_id = m.id and l.returned_at is null and l.due_at < now()) as overdue_loans,
  (select coalesce(sum(f.amount),0)::float from fines f where f.member_id = m.id and not f.paid) as unpaid_fines
  from members m`;

router.get("/", async (req, res, next) => {
  try {
    await ensureFines();
    const q = String(req.query.q || "").trim();
    const status = String(req.query.status || "");
    const where = [];
    const params = [];
    if (q) {
      params.push(`%${q.replace(/[\\%_]/g, "\\$&")}%`);
      where.push(`(m.name ilike $1 or m.email ilike $1 or m.member_number ilike $1 or m.phone ilike $1)`);
    }
    if (status === "active" || status === "suspended") {
      params.push(status);
      where.push(`m.status = $${params.length}`);
    }
    const sql = `${LIST} ${where.length ? "where " + where.join(" and ") : ""} order by lower(m.name), m.id limit 500`;
    const { rows } = await query(sql, params);
    res.json({ members: rows });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return bad(res, "Invalid id");
    await ensureFines();
    const m = await query(`${LIST} where m.id = $1`, [id]);
    if (!m.rows[0]) return res.status(404).json({ error: "Member not found" });
    const full = await query("select address, notes from members where id = $1", [id]);
    const loans = await query(
      `select l.id, l.issued_at, l.due_at, l.returned_at, l.renewals, b.id as book_id, b.title, b.author,
         coalesce(f.amount, 0)::float as fine, coalesce(f.paid, false) as fine_paid,
         case when l.returned_at is not null then 'returned'
              when l.due_at < now() then 'overdue' else 'borrowed' end as state
       from loans l join books b on b.id = l.book_id left join fines f on f.loan_id = l.id
       where l.member_id = $1 order by l.issued_at desc, l.id desc`,
      [id]
    );
    const fines = await query(
      "select coalesce(sum(amount) filter (where not paid),0)::float as unpaid from fines where member_id = $1",
      [id]
    );
    res.json({ member: { ...m.rows[0], ...full.rows[0] }, loans: loans.rows, unpaid_fines: fines.rows[0].unpaid });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { error, value } = parseMember(req.body);
    if (error) return bad(res, error);
    // Member numbers look like LM-0001; retry if two staff register at the same moment.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { rows } = await query(
          `insert into members (member_number, name, email, phone, address, notes, status)
           values (
             'LM-' || lpad((select coalesce(max(substring(member_number from 4)::int),0) + 1
               from members where member_number ~ '^LM-[0-9]+$')::text, 4, '0'),
             $1,$2,$3,$4,$5,$6) returning id`,
          [value.name, value.email, value.phone, value.address, value.notes, value.status]
        );
        const m = await query(`${LIST} where m.id = $1`, [rows[0].id]);
        return res.status(201).json({ member: m.rows[0] });
      } catch (err) {
        if (err.code === "23505" && /email/.test(err.constraint || "")) {
          return res.status(409).json({ error: "A member with this email already exists" });
        }
        if (err.code !== "23505" || attempt === 2) throw err;
      }
    }
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return bad(res, "Invalid id");
    const { error, value } = parseMember(req.body);
    if (error) return bad(res, error);
    const { rowCount } = await query(
      `update members set name=$2, email=$3, phone=$4, address=$5, notes=$6, status=$7 where id=$1`,
      [id, value.name, value.email, value.phone, value.address, value.notes, value.status]
    );
    if (!rowCount) return res.status(404).json({ error: "Member not found" });
    const m = await query(`${LIST} where m.id = $1`, [id]);
    res.json({ member: m.rows[0] });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "A member with this email already exists" });
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return bad(res, "Invalid id");
    const loans = await query("select count(*)::int as n from loans where member_id = $1", [id]);
    if (loans.rows[0].n > 0) {
      return res.status(409).json({ error: "This member has borrowing history and cannot be deleted. Suspend them instead." });
    }
    const { rowCount } = await query("delete from members where id = $1", [id]);
    if (!rowCount) return res.status(404).json({ error: "Member not found" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
