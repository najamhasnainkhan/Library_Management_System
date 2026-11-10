import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  connectionTimeoutMillis: 15000,
});

pool.on("error", (err) => console.error("pg pool error", err.message));

const isConnectionError = (err) =>
  err &&
  (["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EPIPE", "57P01", "08006", "08001"].includes(err.code) ||
    /timeout|terminated|connection/i.test(err.message || ""));

/** Run `fn(client)` inside a transaction; commits on success, rolls back on any error. */
export async function withTransaction(fn) {
  if (!process.env.DATABASE_URL) {
    const e = new Error("DATABASE_URL is not set. Add it in the Secrets panel.");
    e.status = 500;
    throw e;
  }
  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    if (!isConnectionError(err)) throw err;
    client = await pool.connect();
  }
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    try {
      await client.query("rollback");
    } catch {
      /* connection already gone */
    }
    throw err;
  } finally {
    client.release();
  }
}

/** Run a parameterised query; retry once on a connection error (DB may be waking up). */
export async function query(text, params = []) {
  if (!process.env.DATABASE_URL) {
    const e = new Error("DATABASE_URL is not set. Add it in the Secrets panel.");
    e.status = 500;
    throw e;
  }
  try {
    return await pool.query(text, params);
  } catch (err) {
    if (isConnectionError(err)) return pool.query(text, params);
    throw err;
  }
}
