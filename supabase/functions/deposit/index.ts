import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Connection, PublicKey } from "https://esm.sh/@solana/web3.js@1.87.6";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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

    const { transactionSignature, amount } = await req.json();

    if (!transactionSignature || !amount) {
      return new Response(JSON.stringify({ error: "Missing signature or amount" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Initialize Solana Connection
    const connection = new Connection("https://api.mainnet-beta.solana.com");
    
    // Check if the transaction signature is already processed to prevent double spending
    // For production, you should store processed signatures in a Supabase table.
    // For this example, we proceed.

    // Verify transaction on-chain
    const tx = await connection.getTransaction(transactionSignature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });

    if (!tx || tx.meta?.err) {
      return new Response(JSON.stringify({ error: "Invalid or failed transaction" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // NOTE: In a real implementation, we must heavily verify:
    // 1. The transaction involves TOKEN_MINT.
    // 2. The recipient is our Treasury Wallet.
    // 3. The amount transferred matches the `amount` parameter.

    // MOCK: Assuming the verification passes
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch user profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("solana_balance")
      .eq("id", user.id)
      .single();

    const currentBalance = profile?.solana_balance || 0;
    const newBalance = currentBalance + parseFloat(amount);

    // Update user profile balance
    await supabaseAdmin
      .from("profiles")
      .update({ solana_balance: newBalance })
      .eq("id", user.id);

    return new Response(
      JSON.stringify({ success: true, newBalance }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
