import bcrypt from "bcryptjs";
import { query } from "./db.js";

const CATEGORIES = ["Fiction", "Science", "History", "Technology"];

const BOOKS = [
  ["The Left Hand of Darkness", "Ursula K. Le Guin", "9780441478125", "Ace Books", "Fiction", 4],
  ["A Brief History of Time", "Stephen Hawking", "9780553380163", "Bantam", "Science", 3],
  ["Sapiens", "Yuval Noah Harari", "9780062316097", "Harper", "History", 5],
  ["Clean Code", "Robert C. Martin", "9780132350884", "Prentice Hall", "Technology", 2],
  ["Cosmos", "Carl Sagan", "9780345539434", "Ballantine", "Science", 3],
  ["Pride and Prejudice", "Jane Austen", "9780141439518", "Penguin Classics", "Fiction", 6],
];

const MEMBERS = [
  ["LM-0001", "Alice Johnson", "alice@example.com"],
  ["LM-0002", "Bob Martinez", "bob@example.com"],
  ["LM-0003", "Chen Wei", "chen@example.com"],
];

/** Creates demo accounts and sample data, only when the users table is empty. */
export async function seedIfEmpty() {
  const { rows } = await query("select count(*)::int as n from users");
  if (rows[0].n > 0) return false;

  const adminPw = process.env.SEED_ADMIN_PASSWORD || "Admin123!";
  const libPw = process.env.SEED_LIBRARIAN_PASSWORD || "Librarian123!";
  await query(
    `insert into users (name, email, password_hash, role) values
     ('Ada Admin', 'admin@library.test', $1, 'admin'),
     ('Leo Librarian', 'librarian@library.test', $2, 'librarian')
     on conflict (email) do nothing`,
    [await bcrypt.hash(adminPw, 10), await bcrypt.hash(libPw, 10)]
  );

  for (const name of CATEGORIES) {
    await query("insert into categories (name) values ($1) on conflict (name) do nothing", [name]);
  }
  for (const [title, author, isbn, publisher, cat, copies] of BOOKS) {
    await query(
      `insert into books (title, author, isbn, publisher, category_id, total_copies, available_copies)
       values ($1,$2,$3,$4,(select id from categories where name = $5),$6,$6)
       on conflict (isbn) do nothing`,
      [title, author, isbn, publisher, cat, copies]
    );
  }
  for (const [num, name, email] of MEMBERS) {
    await query(
      "insert into members (member_number, name, email) values ($1,$2,$3) on conflict do nothing",
      [num, name, email]
    );
  }

  // One current loan and one overdue loan so the dashboard has something to show.
  const loans = [
    ["9780132350884", "LM-0001", "now() - interval '5 days'", "now() + interval '9 days'"],
    ["9780062316097", "LM-0002", "now() - interval '20 days'", "now() - interval '6 days'"],
  ];
  for (const [isbn, num, issued, due] of loans) {
    await query(
      `insert into loans (book_id, member_id, issued_at, due_at)
       select b.id, m.id, ${issued}, ${due} from books b, members m
       where b.isbn = $1 and m.member_number = $2`,
      [isbn, num]
    );
    await query("update books set available_copies = available_copies - 1 where isbn = $1", [isbn]);
  }
  return true;
}
