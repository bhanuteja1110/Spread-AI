-- Create a private bucket for chat attachments
insert into storage.buckets (id, name, public) 
values ('chat_attachments', 'chat_attachments', false);

-- Set up RLS for the bucket
create policy "Users can upload their own attachments"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'chat_attachments' and auth.uid() = owner);

create policy "Users can view their own attachments"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'chat_attachments' and auth.uid() = owner);

create policy "Users can delete their own attachments"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'chat_attachments' and auth.uid() = owner);
