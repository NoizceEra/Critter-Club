-- Update claim_quest_reward to grant Solana Tokens instead of PetPoints
CREATE OR REPLACE FUNCTION public.claim_quest_reward(
  p_user_id UUID,
  p_quest_progress_id UUID,
  p_reward_points INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status quest_status;
  v_result JSON;
  v_fixed_reward INTEGER := 10; -- Phase 6 Fixed Algorithmic Reward
BEGIN
  -- Lock the quest progress row to prevent race conditions
  SELECT status INTO v_current_status
  FROM user_quest_progress
  WHERE id = p_quest_progress_id
    AND user_id = p_user_id
  FOR UPDATE;

  -- Check if already claimed or not completed
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Quest not found';
  END IF;

  IF v_current_status != 'completed' THEN
    RAISE EXCEPTION 'Quest not completed or already claimed';
  END IF;

  -- Update quest status and profile points atomically
  UPDATE user_quest_progress
  SET status = 'claimed',
      claimed_at = NOW()
  WHERE id = p_quest_progress_id;

  -- Update solana_balance instead of pet_points
  UPDATE profiles
  SET solana_balance = COALESCE(solana_balance, 0) + v_fixed_reward
  WHERE id = p_user_id;

  SELECT json_build_object('success', true, 'reward', v_fixed_reward) INTO v_result;
  RETURN v_result;
END;
$$;

-- Update purchase_shop_item to deduct from solana_balance
CREATE OR REPLACE FUNCTION public.purchase_shop_item(
  p_user_id UUID,
  p_item_id UUID,
  p_item_price INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance INTEGER;
  v_inventory_id UUID;
BEGIN
  -- Lock user's profile row to prevent race conditions
  SELECT COALESCE(solana_balance, 0) INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- Check sufficient funds
  IF v_current_balance < p_item_price THEN
    RAISE EXCEPTION 'Insufficient Tokens';
  END IF;

  -- Deduct tokens first (Burn mechanism)
  UPDATE profiles
  SET solana_balance = solana_balance - p_item_price
  WHERE id = p_user_id;

  -- Add to inventory (increment if exists)
  INSERT INTO inventory (user_id, item_id, quantity)
  VALUES (p_user_id, p_item_id, 1)
  ON CONFLICT (user_id, item_id)
  DO UPDATE SET quantity = inventory.quantity + 1
  RETURNING id INTO v_inventory_id;

  RETURN json_build_object('success', true, 'inventory_id', v_inventory_id);
END;
$$;

-- Update list_pet_on_marketplace to charge 1 Token instead of 50 PetPoints
CREATE OR REPLACE FUNCTION public.list_pet_on_marketplace(
  p_user_id uuid,
  p_pet_id uuid,
  p_price integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance INTEGER;
  v_listing_fee INTEGER := 1; -- 1 Token Listing Fee
  v_listing_id UUID;
BEGIN
  -- Check if pet belongs to user
  IF NOT EXISTS (
    SELECT 1 FROM pets 
    WHERE id = p_pet_id AND owner_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Pet not found or does not belong to you';
  END IF;

  -- Check if pet is already listed
  IF EXISTS (
    SELECT 1 FROM marketplace_listings 
    WHERE pet_id = p_pet_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Pet is already listed on marketplace';
  END IF;

  -- Lock user's profile
  SELECT COALESCE(solana_balance, 0) INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- Check sufficient funds for listing fee
  IF v_current_balance < v_listing_fee THEN
    RAISE EXCEPTION 'Insufficient Tokens for listing fee';
  END IF;

  -- Deduct listing fee
  UPDATE profiles
  SET solana_balance = solana_balance - v_listing_fee
  WHERE id = p_user_id;

  -- Create listing
  INSERT INTO marketplace_listings (seller_id, pet_id, price, status)
  VALUES (p_user_id, p_pet_id, p_price, 'active')
  RETURNING id INTO v_listing_id;

  RETURN json_build_object('success', true, 'listing_id', v_listing_id);
END;
$$;

-- Update purchase_marketplace_pet to use solana_balance and apply 5% royalty/tax
CREATE OR REPLACE FUNCTION public.purchase_marketplace_pet(p_listing_id uuid, p_buyer_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing RECORD;
  v_buyer_balance INTEGER;
  v_buyer_pet_count INTEGER;
  v_buyer_max_pets INTEGER;
  v_marketplace_fee INTEGER;
  v_seller_amount INTEGER;
BEGIN
  -- Lock and get listing
  SELECT * INTO v_listing
  FROM marketplace_listings
  WHERE id = p_listing_id AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found or not active';
  END IF;

  IF v_listing.seller_id = p_buyer_id THEN
    RAISE EXCEPTION 'Cannot buy your own listing';
  END IF;

  -- Lock buyer profile and get pet count
  SELECT COALESCE(solana_balance, 0), max_pets INTO v_buyer_balance, v_buyer_max_pets
  FROM profiles
  WHERE id = p_buyer_id
  FOR UPDATE;

  -- Count buyer's current pets
  SELECT COUNT(*) INTO v_buyer_pet_count
  FROM pets
  WHERE owner_id = p_buyer_id;

  -- Check roster space
  IF v_buyer_pet_count >= v_buyer_max_pets THEN
    RAISE EXCEPTION 'Not enough roster space';
  END IF;

  IF v_buyer_balance < v_listing.price THEN
    RAISE EXCEPTION 'Insufficient Tokens';
  END IF;

  -- Calculate marketplace fee (5%)
  v_marketplace_fee := FLOOR(v_listing.price * 0.05);
  v_seller_amount := v_listing.price - v_marketplace_fee;

  -- Transfer pet ownership
  UPDATE pets
  SET owner_id = p_buyer_id
  WHERE id = v_listing.pet_id;

  -- Update buyer balance
  UPDATE profiles
  SET solana_balance = solana_balance - v_listing.price
  WHERE id = p_buyer_id;

  -- Update seller balance
  UPDATE profiles
  SET solana_balance = COALESCE(solana_balance, 0) + v_seller_amount
  WHERE id = v_listing.seller_id;

  -- Mark listing as sold
  UPDATE marketplace_listings
  SET status = 'sold',
      sold_at = NOW()
  WHERE id = p_listing_id;

  -- Log transfer
  INSERT INTO pet_transfers (
    pet_id, from_user_id, to_user_id, 
    transfer_type, price, marketplace_listing_id
  ) VALUES (
    v_listing.pet_id, v_listing.seller_id, p_buyer_id,
    'marketplace', v_listing.price, p_listing_id
  );

  RETURN json_build_object('success', true, 'pet_id', v_listing.pet_id);
END;
$$;
