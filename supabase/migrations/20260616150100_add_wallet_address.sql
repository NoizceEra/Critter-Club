-- Add wallet_address to profiles to support WalletAuthButton
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet_address TEXT UNIQUE;
