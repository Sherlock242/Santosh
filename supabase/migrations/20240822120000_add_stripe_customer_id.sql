
-- Add the stripe_customer_id column to the users table
alter table public.users
  add column stripe_customer_id text;

-- Add a policy to allow users to read their own stripe_customer_id
create policy "Allow individual user access to their own stripe_customer_id"
  on public.users
  for select
  using (auth.uid() = id);

-- Add a policy to allow users to update their own stripe_customer_id
create policy "Allow individual user to update their own stripe_customer_id"
  on public.users
  for update
  using (auth.uid() = id);
