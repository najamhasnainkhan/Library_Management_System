alter table members add column if not exists address text;
alter table members add column if not exists notes text;
create index if not exists members_name_idx on members (lower(name));
