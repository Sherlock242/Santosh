
alter table "public"."users" add column "is_gold_member" boolean not null default false;

alter table "public"."users" add column "razorpay_subscription_id" text;
