-- 0005_avatars_bucket.sql

-- Create a public bucket for user avatars
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Set up RLS for the bucket
create policy "Avatars are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatars"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and auth.uid() = owner);

create policy "Users can update their own avatars"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and auth.uid() = owner);

create policy "Users can delete their own avatars"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and auth.uid() = owner);
