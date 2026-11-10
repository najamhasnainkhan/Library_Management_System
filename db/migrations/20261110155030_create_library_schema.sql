create table if not exists users (
  id serial primary key,
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null check (role in ('admin','librarian')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id serial primary key,
  name text not null unique
);

create table if not exists books (
  id serial primary key,
  title text not null,
  author text not null,
  isbn text unique,
  publisher text,
  category_id integer references categories(id) on delete set null,
  total_copies integer not null default 1 check (total_copies >= 0),
  available_copies integer not null default 1 check (available_copies >= 0),
  created_at timestamptz not null default now()
);
create index if not exists books_title_idx on books (lower(title));
create index if not exists books_category_idx on books (category_id);

create table if not exists members (
  id serial primary key,
  member_number text not null unique,
  name text not null,
  email text unique,
  phone text,
  status text not null default 'active' check (status in ('active','suspended')),
  joined_at timestamptz not null default now()
);

create table if not exists loans (
  id serial primary key,
  book_id integer not null references books(id),
  member_id integer not null references members(id),
  issued_by integer references users(id) on delete set null,
  issued_at timestamptz not null default now(),
  due_at timestamptz not null,
  returned_at timestamptz,
  renewals integer not null default 0
);
create index if not exists loans_member_idx on loans (member_id);
create index if not exists loans_book_idx on loans (book_id);
create index if not exists loans_open_idx on loans (due_at) where returned_at is null;

create table if not exists reservations (
  id serial primary key,
  book_id integer not null references books(id) on delete cascade,
  member_id integer not null references members(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','ready','fulfilled','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists fines (
  id serial primary key,
  loan_id integer not null references loans(id) on delete cascade,
  member_id integer not null references members(id) on delete cascade,
  amount numeric(10,2) not null default 0,
  paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists fines_member_idx on fines (member_id);

create table if not exists notifications (
  id serial primary key,
  member_id integer not null references members(id) on delete cascade,
  type text not null check (type in ('due_soon','overdue','reservation','general')),
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_member_idx on notifications (member_id, read_at);
