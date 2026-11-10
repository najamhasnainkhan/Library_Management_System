import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db.js";
import { requireAuth, requireRole, publicUser } from "../auth.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));

router.get("/", async (_req, res, next) => {
  try {
    const { rows } = await query(
      "select id, name, email, role, active, created_at from users order by created_at, id"
    );
    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const role = req.body?.role;
    if (!name || !email) return res.status(400).json({ error: "Name and email are required" });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Enter a valid email" });
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
    if (!["admin", "librarian"].includes(role)) return res.status(400).json({ error: "Role must be admin or librarian" });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `insert into users (name, email, password_hash, role) values ($1,$2,$3,$4)
       on conflict (email) do nothing
       returning id, name, email, role, active`,
      [name, email, hash, role]
    );
    if (!rows[0]) return res.status(409).json({ error: "A staff account with this email already exists" });
    res.status(201).json({ user: publicUser(rows[0]) });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });
    const { active, role } = req.body || {};
    if (id === req.user.id && (active === false || (role && role !== "admin"))) {
      return res.status(400).json({ error: "You cannot deactivate or demote your own account" });
    }
    if (role !== undefined && !["admin", "librarian"].includes(role)) {
      return res.status(400).json({ error: "Role must be admin or librarian" });
    }
    const { rows } = await query(
      `update users set
         active = coalesce($2::boolean, active),
         role = coalesce($3::text, role)
       where id = $1 returning id, name, email, role, active`,
      [id, typeof active === "boolean" ? active : null, role ?? null]
    );
    if (!rows[0]) return res.status(404).json({ error: "Staff account not found" });
    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
