import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db.js";
import { setSession, clearSession, publicUser, requireAuth } from "../auth.js";

const router = Router();

// Small in-memory limiter: 5 failed attempts per email+IP per 15 minutes.
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

function limited(key) {
  const a = attempts.get(key);
  if (!a || Date.now() - a.first > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return a.count >= MAX_FAILS;
}
function fail(key) {
  const a = attempts.get(key);
  if (!a || Date.now() - a.first > WINDOW_MS) attempts.set(key, { first: Date.now(), count: 1 });
  else a.count += 1;
}

router.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    const key = `${email}|${req.ip}`;
    if (limited(key)) {
      return res.status(429).json({ error: "Too many attempts. Try again in a few minutes." });
    }

    const { rows } = await query("select * from users where email = $1", [email]);
    const user = rows[0];
    const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !ok || !user.active) {
      fail(key);
      return res.status(401).json({ error: "Invalid email or password" });
    }
    attempts.delete(key);
    setSession(req, res, user);
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

export default router;
