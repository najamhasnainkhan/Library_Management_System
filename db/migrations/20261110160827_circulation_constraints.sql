create unique index if not exists fines_loan_unique on fines (loan_id);
create index if not exists reservations_book_idx on reservations (book_id, status);
create index if not exists reservations_member_idx on reservations (member_id, status);
create unique index if not exists reservations_active_unique on reservations (book_id, member_id) where status in ('pending','ready');
