import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../auth.js";

const router = Router();
router.use(requireAuth);

const SELECT = `select b.id, b.title, b.author, b.isbn, b.publisher, b.category_id,
  c.name as category, b.total_copies, b.available_copies, b.created_at,
  (select count(*)::int from loans l where l.book_id = b.id and l.returned_at is null) as borrowed_copies,
  (select count(*)::int from loans l where l.book_id = b.id and l.returned_at is null and l.due_at < now()) as overdue_copies,
  (select count(*)::int from reservations r where r.book_id = b.id and r.status in ('pending','ready')) as reserved_count,
  (select count(*)::int from reservations r where r.book_id = b.id and r.status = 'ready') as ready_count
  from books b left join categories c on c.id = b.category_id`;

function bad(res, message) {
  return res.status(400).json({ error: message });
}

/** Validate and normalise the book body. Returns { error } or { value }. */
function parseBook(body = {}) {
  const title = String(body.title || "").trim();
  const author = String(body.author || "").trim();
  const isbn = String(body.isbn || "").replace(/[\s-]/g, "").trim() || null;
  const publisher = String(body.publisher || "").trim() || null;
  const total = Number(body.total_copies);
  const categoryId = body.category_id === "" || body.category_id == null ? null : Number(body.category_id);
  if (!title || !author) return { error: "Title and author are required" };
  if (isbn && !/^[0-9]{9}[0-9Xx]$|^[0-9]{13}$/.test(isbn)) return { error: "ISBN must be 10 or 13 characters" };
  if (!Number.isInteger(total) || total < 0 || total > 100000) return { error: "Quantity must be a whole number (0 or more)" };
  if (categoryId !== null && !Number.isInteger(categoryId)) return { error: "Invalid category" };
  return { value: { title, author, isbn, publisher, total, categoryId } };
}

router.get("/", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const category = req.query.category ? Number(req.query.category) : null;
    const availability = String(req.query.availability || "");
    const where = [];
    const params = [];
    if (q) {
      params.push(`%${q.replace(/[\\%_]/g, "\\$&")}%`);
      where.push(`(b.title ilike $${params.length} or b.author ilike $${params.length}
        or b.isbn ilike $${params.length} or b.publisher ilike $${params.length})`);
    }
    if (category !== null && Number.isInteger(category)) {
      params.push(category);
      where.push(`b.category_id = $${params.length}`);
    }
    if (req.query.category === "none") where.push("b.category_id is null");
    if (availability === "available") where.push("b.available_copies > 0");
    if (availability === "unavailable") where.push("b.available_copies = 0");
    if (availability === "borrowed") where.push("exists (select 1 from loans l where l.book_id = b.id and l.returned_at is null)");
    if (availability === "overdue") where.push("exists (select 1 from loans l where l.book_id = b.id and l.returned_at is null and l.due_at < now())");
    if (availability === "reserved") where.push("exists (select 1 from reservations r where r.book_id = b.id and r.status in ('pending','ready'))");
    const sql = `${SELECT} ${where.length ? "where " + where.join(" and ") : ""} order by lower(b.title), b.id limit 500`;
    const { rows } = await query(sql, params);
    res.json({ books: rows });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return bad(res, "Invalid id");
    const { rows } = await query(`${SELECT} where b.id = $1`, [id]);
    if (!rows[0]) return res.status(404).json({ error: "Book not found" });
    res.json({ book: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { error, value } = parseBook(req.body);
    if (error) return bad(res, error);
    const { rows } = await query(
      `insert into books (title, author, isbn, publisher, category_id, total_copies, available_copies)
       values ($1,$2,$3,$4,$5,$6,$6) on conflict (isbn) do nothing returning id`,
      [value.title, value.author, value.isbn, value.publisher, value.categoryId, value.total]
    );
    if (!rows[0]) return res.status(409).json({ error: "A book with this ISBN already exists" });
    const full = await query(`${SELECT} where b.id = $1`, [rows[0].id]);
    res.status(201).json({ book: full.rows[0] });
  } catch (err) {
    if (err.code === "23503") return bad(res, "That category no longer exists");
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return bad(res, "Invalid id");
    const { error, value } = parseBook(req.body);
    if (error) return bad(res, error);
    const cur = await query("select total_copies, available_copies from books where id = $1", [id]);
    if (!cur.rows[0]) return res.status(404).json({ error: "Book not found" });
    const borrowed = cur.rows[0].total_copies - cur.rows[0].available_copies;
    if (value.total < borrowed) {
      return bad(res, `${borrowed} copies are currently on loan, so the quantity cannot be below ${borrowed}`);
    }
    await query(
      `update books set title=$2, author=$3, isbn=$4, publisher=$5, category_id=$6,
         total_copies=$7, available_copies=$7 - $8 where id=$1`,
      [id, value.title, value.author, value.isbn, value.publisher, value.categoryId, value.total, borrowed]
    );
    const full = await query(`${SELECT} where b.id = $1`, [id]);
    res.json({ book: full.rows[0] });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "A book with this ISBN already exists" });
    if (err.code === "23503") return bad(res, "That category no longer exists");
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return bad(res, "Invalid id");
    const loans = await query("select count(*)::int as n from loans where book_id = $1", [id]);
    if (loans.rows[0].n > 0) {
      return res.status(409).json({ error: "This book has borrowing history and cannot be deleted. Set its quantity to 0 instead." });
    }
    const { rowCount } = await query("delete from books where id = $1", [id]);
    if (!rowCount) return res.status(404).json({ error: "Book not found" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
