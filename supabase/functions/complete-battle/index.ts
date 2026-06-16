import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0'
import { corsHeaders } from '../_shared/cors.ts'

interface BattleCompleteRequest {
  battleId: string
  winnerId: string
  attackerDamageDealt: number
  defenderDamageDealt: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { battleId, winnerId, attackerDamageDealt, defenderDamageDealt }: BattleCompleteRequest = await req.json()

    // Fetch battle details
    const { data: battle, error: battleError } = await supabase
      .from('battles')
      .select('*, attacker_pet:pets!battles_attacker_pet_id_fkey(level), defender_pet:pets!battles_defender_pet_id_fkey(level)')
      .eq('id', battleId)
      .eq('status', 'active')
      .single()

    if (battleError || !battle) {
      console.error('Battle fetch error:', battleError)
      return new Response(JSON.stringify({ error: 'Battle not found or already completed' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if this is a wagered PVP battle
    let wagerAmount = 0
    if (!battle.is_ai_battle && battle.defender_id) {
      const { data: challenge } = await supabase
        .from('battle_challenges')
        .select('wager_amount')
        .eq('status', 'accepted')
        .or(`challenger_id.eq.${battle.attacker_id},challenger_id.eq.${battle.defender_id}`)
        .or(`challenged_id.eq.${battle.attacker_id},challenged_id.eq.${battle.defender_id}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (challenge) {
        wagerAmount = challenge.wager_amount
      }
    }

    // Verify user is part of this battle
    if (battle.attacker_id !== user.id && battle.defender_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Not authorized for this battle' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validate winner against stored battle turns
    const { data: lastTurn, error: turnError } = await supabase
      .from('battle_turns')
      .select('attacker_hp, defender_hp')
      .eq('battle_id', battleId)
      .order('turn_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastTurn) {
      // Determine actual winner from final HP state
      const actualWinner = lastTurn.attacker_hp > 0 ? battle.attacker_id : battle.defender_id
      
      // Validate claimed winner matches actual battle outcome
      if (winnerId && winnerId !== actualWinner) {
        console.error('Winner validation failed:', { claimed: winnerId, actual: actualWinner })
        return new Response(JSON.stringify({ error: 'Invalid battle outcome claimed' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Basic validation - winnerId must be one of the participants
    if (winnerId && winnerId !== battle.attacker_id && winnerId !== battle.defender_id) {
      return new Response(JSON.stringify({ error: 'Invalid winner ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Calculate rewards server-side
    const won = winnerId === user.id
    const userPetLevel = battle.attacker_id === user.id ? battle.attacker_pet.level : battle.defender_pet.level
    
    // Base PvP win reward: 20 Tokens
    let tokenRewards = won ? 20 : 0
    const experience = won ? 30 + userPetLevel * 5 : 5

    // Add wager pot to winner's rewards (with 2% house cut)
    if (wagerAmount > 0 && won) {
      const totalPot = wagerAmount * 2
      const houseCut = Math.floor(totalPot * 0.02)
      const winnerTake = totalPot - houseCut
      tokenRewards += winnerTake
      console.log('Winner receives wager pot after 2% cut:', winnerTake)
    }

    console.log('Calculated rewards:', { tokenRewards, experience, won, userPetLevel, wagerAmount })

    // Update battle record
    const { error: battleUpdateError } = await supabase
      .from('battles')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        winner_id: winnerId,
        rewards_petpoints: tokenRewards, -- Keep using the column for logs, but it's Tokens now
        rewards_experience: experience,
        attacker_damage_dealt: attackerDamageDealt,
        defender_damage_dealt: defenderDamageDealt
      })
      .eq('id', battleId)

    if (battleUpdateError) {
      console.error('Battle update error:', battleUpdateError)
      return new Response(JSON.stringify({ error: 'Failed to update battle' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Update user profile with rewards (Solana Balance)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('solana_balance')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError)
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const currentBalance = profile.solana_balance || 0
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({ solana_balance: currentBalance + tokenRewards })
      .eq('id', user.id)

    if (profileUpdateError) {
      console.error('Profile update error:', profileUpdateError)
      return new Response(JSON.stringify({ error: 'Failed to update profile' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Update pet experience
    const petId = battle.attacker_id === user.id ? battle.attacker_pet_id : battle.defender_pet_id
    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('experience, level')
      .eq('id', petId)
      .single()

    if (!petError && pet) {
      const newExperience = pet.experience + experience
      const experienceNeeded = pet.level * 100
      const newLevel = newExperience >= experienceNeeded ? pet.level + 1 : pet.level

      await supabase
        .from('pets')
        .update({
          experience: newExperience >= experienceNeeded ? newExperience - experienceNeeded : newExperience,
          level: newLevel
        })
        .eq('id', petId)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        rewards: tokenRewards, 
        experience,
        won 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in complete-battle function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
