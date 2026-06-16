-- Migration to add solana_balance to profiles for the Web2.5 economy

ALTER TABLE "public"."profiles"
ADD COLUMN "solana_balance" double precision NOT NULL DEFAULT 0;

-- Optional: Migrate existing pet_points to solana_balance if needed
-- UPDATE "public"."profiles" SET "solana_balance" = "pet_points";
