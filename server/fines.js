import { query } from "./db.js";
import { FINE_PER_DAY } from "./config.js";

/** SQL for whole days a loan is (or was) late; 0 when on time. `a` is the loans table alias. */
export const daysLate = (a = "l") =>
  `greatest(0, floor(extract(epoch from (coalesce(${a}.returned_at, now()) - ${a}.due_at)) / 86400))::int`;

export const round2 = (n) => Math.round(n * 100) / 100;

let lastSync = 0;

/**
 * Creates/updates one fine row per overdue open loan (days late x daily rate).
 * Paid fines are never touched. Throttled so list screens can call it freely.
 */
export async function ensureFines(force = false) {
  if (!force && Date.now() - lastSync < 20000) return;
  lastSync = Date.now();
  try {
    await query(
      `insert into fines (loan_id, member_id, amount)
       select l.id, l.member_id, (${daysLate()} * $1::numeric)
       from loans l where l.returned_at is null and ${daysLate()} > 0
       on conflict (loan_id) do update set amount = excluded.amount where not fines.paid`,
      [FINE_PER_DAY]
    );
  } catch (err) {
    lastSync = 0;
    console.error("Fine sync failed:", err.message);
  }
}

/** Final fine for one loan, written inside the return transaction. Returns the amount (0 if on time). */
export async function settleLoanFine(client, loanId) {
  const { rows } = await client.query(
    `insert into fines (loan_id, member_id, amount)
     select l.id, l.member_id, (${daysLate()} * $2::numeric) from loans l
     where l.id = $1 and ${daysLate()} > 0
     on conflict (loan_id) do update set amount = excluded.amount where not fines.paid
     returning amount::float as amount`,
    [loanId, FINE_PER_DAY]
  );
  return rows[0]?.amount || 0;
}
