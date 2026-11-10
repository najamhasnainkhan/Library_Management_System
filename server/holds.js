/** Number of copies currently held for members whose reservation is ready for pickup. */
export async function readyCount(client, bookId, exceptMemberId = null) {
  const { rows } = await client.query(
    `select count(*)::int as n from reservations
     where book_id = $1 and status = 'ready' and ($2::int is null or member_id <> $2)`,
    [bookId, exceptMemberId]
  );
  return rows[0].n;
}

/**
 * After a copy comes back (or a hold is cancelled), move the oldest waiting reservations
 * to "ready" for as many free copies as exist, and leave a notification row for the member.
 */
export async function promoteReservations(client, bookId) {
  const book = (await client.query("select title, available_copies from books where id = $1 for update", [bookId])).rows[0];
  if (!book) return;
  let free = book.available_copies - (await readyCount(client, bookId));
  while (free > 0) {
    const { rows } = await client.query(
      `update reservations set status = 'ready' where id = (
         select id from reservations where book_id = $1 and status = 'pending'
         order by created_at, id limit 1)
       returning id, member_id`,
      [bookId]
    );
    if (!rows[0]) break;
    await client.query(
      "insert into notifications (member_id, type, message) values ($1, 'reservation', $2)",
      [rows[0].member_id, `Your reserved book "${book.title}" is ready for pickup.`]
    );
    free--;
  }
}
