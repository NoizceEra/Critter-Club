import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Top 10 tiered rewards
const TIER_REWARDS = [2500, 1500, 750, 200, 200, 200, 200, 200, 200, 200];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Only allow secure invocation (e.g., from pg_cron)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) {
       return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let totalDistributed = 0;

    // Helper to process a leaderboard and distribute rewards
    const distributeToTop10 = async (profiles: { id: string }[], leaderboardName: string) => {
      for (let i = 0; i < profiles.length && i < 10; i++) {
        const userId = profiles[i].id;
        const reward = TIER_REWARDS[i];

        // Fetch current balance
        const { data: userProfile } = await supabaseAdmin
          .from("profiles")
          .select("solana_balance")
          .eq("id", userId)
          .single();

        const currentBalance = userProfile?.solana_balance || 0;

        // Add reward
        await supabaseAdmin
          .from("profiles")
          .update({ solana_balance: currentBalance + reward })
          .eq("id", userId);

        totalDistributed += reward;
      }
    };

    // 1. Points Leaderboard
    const { data: topPoints } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .order("pet_points", { ascending: false })
      .limit(10);
      
    if (topPoints) await distributeToTop10(topPoints, "points");

    // 2. Highest Level Pet Leaderboard
    const { data: topPetsByLevel } = await supabaseAdmin
      .from("pets")
      .select("owner_id, level")
      .order("level", { ascending: false });

    if (topPetsByLevel) {
      const ownerMaxLevels = new Map<string, number>();
      topPetsByLevel.forEach((pet) => {
        const currentMax = ownerMaxLevels.get(pet.owner_id) || 0;
        ownerMaxLevels.set(pet.owner_id, Math.max(currentMax, pet.level || 1));
      });
      
      const levelRankings = Array.from(ownerMaxLevels.entries())
        .map(([id, level]) => ({ id, level }))
        .sort((a, b) => b.level - a.level)
        .slice(0, 10);

      await distributeToTop10(levelRankings, "level");
    }

    // 3. Most Pets Leaderboard
    const { data: allPets } = await supabaseAdmin
      .from("pets")
      .select("owner_id");

    if (allPets) {
      const petCounts = new Map<string, number>();
      allPets.forEach((pet) => {
        petCounts.set(pet.owner_id, (petCounts.get(pet.owner_id) || 0) + 1);
      });

      const petCountRankings = Array.from(petCounts.entries())
        .map(([id, count]) => ({ id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      await distributeToTop10(petCountRankings, "collection");
    }

    return new Response(
      JSON.stringify({ success: true, message: `Successfully distributed ${totalDistributed} Tokens.` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
