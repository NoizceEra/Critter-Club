import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Connection, Keypair, PublicKey, Transaction } from "https://esm.sh/@solana/web3.js@1.87.6";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getOrCreateAssociatedTokenAccount, createTransferInstruction } from "https://esm.sh/@solana/spl-token@0.3.11";
import bs58 from "https://esm.sh/bs58@5.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOKEN_MINT = "6vjQQTFQmYg6xummvLBJshY7Kkz7rrSkdDnd9dqSpump";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { amount, destinationAddress } = await req.json();

    if (!amount || !destinationAddress || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount or destination address" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify user balance
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("solana_balance")
      .eq("id", user.id)
      .single();

    const currentBalance = profile?.solana_balance || 0;
    const withdrawFee = 0.1; // Flat withdrawal fee
    const totalDeduction = amount + withdrawFee;

    if (currentBalance < totalDeduction) {
      return new Response(JSON.stringify({ error: "Insufficient off-chain balance (including 0.1 Token fee)" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Optimistically deduct balance + fee
    const newBalance = currentBalance - totalDeduction;
    await supabaseAdmin
      .from("profiles")
      .update({ solana_balance: newBalance })
      .eq("id", user.id);

    try {
      // Process on-chain transfer
      const connection = new Connection("https://api.mainnet-beta.solana.com");
      
      // Load Treasury Keypair from Supabase Secrets
      const treasuryPrivateKey = Deno.env.get("TREASURY_PRIVATE_KEY");
      if (!treasuryPrivateKey) {
        throw new Error("Server configuration error: Missing TREASURY_PRIVATE_KEY");
      }

      const treasuryKeypair = Keypair.fromSecretKey(bs58.decode(treasuryPrivateKey));
      const toPublicKey = new PublicKey(destinationAddress);
      const mintPublicKey = new PublicKey(TOKEN_MINT);

      // Get or create ATAs
      const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        treasuryKeypair,
        mintPublicKey,
        treasuryKeypair.publicKey
      );

      const toTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        treasuryKeypair,
        mintPublicKey,
        toPublicKey
      );

      // Create transfer instruction
      const transferInstruction = createTransferInstruction(
        fromTokenAccount.address,
        toTokenAccount.address,
        treasuryKeypair.publicKey,
        amount * Math.pow(10, 6) // Adjust according to token decimals
      );

      const transaction = new Transaction().add(transferInstruction);
      
      // Send and confirm transaction
      const signature = await connection.sendTransaction(transaction, [treasuryKeypair]);
      await connection.confirmTransaction(signature);

      return new Response(
        JSON.stringify({ success: true, newBalance, signature }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (onChainError: any) {
      // If on-chain transfer fails, rollback the off-chain deduction
      await supabaseAdmin
        .from("profiles")
        .update({ solana_balance: currentBalance })
        .eq("id", user.id);
        
      console.error("On-chain transfer failed, rolling back balance:", onChainError);
      throw new Error(`Transfer failed: ${onChainError.message}`);
    }

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
