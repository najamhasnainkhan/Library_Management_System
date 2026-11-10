import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res, next) => {
  try {
    const { rows } = await query(
      `select c.id, c.name, count(b.id)::int as book_count
       from categories c left join books b on b.category_id = c.id
       group by c.id order by lower(c.name)`
    );
    res.json({ categories: rows });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ error: "Category name is required" });
    if (name.length > 60) return res.status(400).json({ error: "Category name is too long" });
    const { rows } = await query(
      "insert into categories (name) values ($1) on conflict (name) do nothing returning id, name",
      [name]
    );
    if (!rows[0]) return res.status(409).json({ error: "That category already exists" });
    res.status(201).json({ category: { ...rows[0], book_count: 0 } });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });
    // Books keep existing; their category becomes empty (on delete set null).
    const { rowCount } = await query("delete from categories where id = $1", [id]);
    if (!rowCount) return res.status(404).json({ error: "Category not found" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
