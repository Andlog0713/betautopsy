-- Add is_admin column to profiles
alter table profiles add column if not exists is_admin boolean default false;
