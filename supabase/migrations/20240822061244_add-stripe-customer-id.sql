
-- Add the new column to store razorpay customer IDs
alter table "public"."users" add column "razorpay_customer_id" text;

-- Add a unique constraint to ensure no two users have the same customer ID
create unique index users_razorpay_customer_id_key on public.users using btree (razorpay_customer_id);

-- Add a policy to allow users to see their own razorpay customer id
create policy "Allow own read access to razorpay_customer_id"
on "public"."users"
as permissive
for select
to authenticated
using ((auth.uid() = id));
