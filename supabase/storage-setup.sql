-- Run this once in Supabase SQL Editor.
insert into storage.buckets (id, name, public)
values ('lease-files', 'lease-files', true)
on conflict (id) do update set public = true;

create policy "Public lease files are readable"
on storage.objects for select
using (bucket_id = 'lease-files');

create policy "Anyone can upload lease files"
on storage.objects for insert
with check (bucket_id = 'lease-files');