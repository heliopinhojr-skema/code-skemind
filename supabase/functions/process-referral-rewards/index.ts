import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const REFERRAL_REWARD = 10 // k$10 per referral
const MAX_REFERRAL_REWARDS = 10 // Maximum referrals that give rewards

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[process-referral-rewards] Missing Authorization header')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Client with user's auth for validation
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Validate JWT and get user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    
    if (userError || !user) {
      console.error('[process-referral-rewards] Invalid JWT:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id
    console.log('[process-referral-rewards] User authenticated:', userId)

    // Admin client for operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Get player profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, energy')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      console.error('[process-referral-rewards] Profile not found:', profileError)
      return new Response(
        JSON.stringify({ error: 'Player profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[process-referral-rewards] Processing for player:', profile.name)

    // Get all pending referrals for this player (as inviter)
    const { data: pendingReferrals, error: referralsError } = await supabaseAdmin
      .from('referrals')
      .select(`
        id,
        invited_id,
        reward_amount,
        reward_credited,
        created_at,
        invited:profiles!referrals_invited_id_fkey(id, name, emoji)
      `)
      .eq('inviter_id', profile.id)
      .eq('reward_credited', false)
      .order('created_at', { ascending: true })

    if (referralsError) {
      console.error('[process-referral-rewards] Error fetching referrals:', referralsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch referrals' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[process-referral-rewards] Pending referrals:', pendingReferrals?.length || 0)

    if (!pendingReferrals || pendingReferrals.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          processed: 0, 
          total_reward: 0,
          message: 'No pending referral rewards'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Count already credited referrals
    const { count: creditedCount } = await supabaseAdmin
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('inviter_id', profile.id)
      .eq('reward_credited', true)

    const alreadyCredited = creditedCount || 0
    const remainingSlots = MAX_REFERRAL_REWARDS - alreadyCredited
    console.log('[process-referral-rewards] Already credited:', alreadyCredited, 'Remaining slots:', remainingSlots)

    if (remainingSlots <= 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          processed: 0, 
          total_reward: 0,
          message: 'Maximum referral rewards reached (10)'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process up to remaining slots
    const toProcess = pendingReferrals.slice(0, remainingSlots)
    let totalReward = 0
    const processedReferrals: string[] = []

    for (const referral of toProcess) {
      const reward = referral.reward_amount || REFERRAL_REWARD
      
      // Credit reward to inviter
      const { error: energyError } = await supabaseAdmin.rpc('update_player_energy', {
        p_player_id: profile.id,
        p_amount: reward
      })

      if (energyError) {
        console.error('[process-referral-rewards] Failed to credit energy:', energyError)
        continue
      }

      // Mark referral as credited
      const { error: updateError } = await supabaseAdmin
        .from('referrals')
        .update({ reward_credited: true })
        .eq('id', referral.id)

      if (updateError) {
        console.error('[process-referral-rewards] Failed to mark as credited:', updateError)
        // Rollback energy? For now, just log
        continue
      }

      totalReward += reward
      processedReferrals.push(referral.id)
      console.log('[process-referral-rewards] ✅ Processed referral:', referral.id, 'Reward:', reward)
    }

    // Get updated energy balance
    const { data: updatedProfile } = await supabaseAdmin
      .from('profiles')
      .select('energy')
      .eq('id', profile.id)
      .single()

    console.log('[process-referral-rewards] Total processed:', processedReferrals.length, 'Total reward:', totalReward)

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedReferrals.length,
        total_reward: totalReward,
        new_balance: updatedProfile?.energy || 0,
        message: `Credited k$${totalReward} from ${processedReferrals.length} referral(s)`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[process-referral-rewards] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
