import jwt from "jsonwebtoken";
import { query } from "./db.js";

const COOKIE = "lms_token";
const MAX_AGE_MS = 8 * 60 * 60 * 1000;

function secret() {
  if (!process.env.SESSION_SECRET) {
    const e = new Error("SESSION_SECRET is not set. Add it in the Secrets panel.");
    e.status = 500;
    throw e;
  }
  return process.env.SESSION_SECRET;
}

export function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, active: u.active };
}

export function setSession(req, res, user) {
  const token = jwt.sign({ sub: user.id, role: user.role }, secret(), { expiresIn: "8h" });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.secure,
    maxAge: MAX_AGE_MS,
    path: "/",
  });
}

export function clearSession(res) {
  res.clearCookie(COOKIE, { path: "/" });
}

/** Reads the JWT cookie, then loads the user fresh so role changes/deactivation apply at once. */
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE];
    if (!token) return res.status(401).json({ error: "Not signed in" });
    let payload;
    try {
      payload = jwt.verify(token, secret());
    } catch {
      return res.status(401).json({ error: "Session expired. Please sign in again." });
    }
    const { rows } = await query(
      "select id, name, email, role, active from users where id = $1",
      [payload.sub]
    );
    const user = rows[0];
    if (!user || !user.active) return res.status(401).json({ error: "Account unavailable" });
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export const requireRole =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user?.role)
      ? next()
      : res.status(403).json({ error: "You do not have permission to do that" });
