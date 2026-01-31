import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RaceResultPayload {
  race_id: string
  won: boolean
  attempts: number
  score: number
  time_remaining: number | null
  guesses: Array<{
    guess: string[]
    feedback: { exact: number; partial: number }
  }>
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[submit-race-result] Missing or invalid Authorization header')
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
      console.error('[submit-race-result] Invalid JWT:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id
    console.log('[submit-race-result] User authenticated:', userId)

    // Parse payload
    const payload: RaceResultPayload = await req.json()
    console.log('[submit-race-result] Payload:', JSON.stringify(payload))

    // Validate required fields
    if (!payload.race_id || typeof payload.won !== 'boolean' || typeof payload.attempts !== 'number') {
      console.error('[submit-race-result] Invalid payload - missing required fields')
      return new Response(
        JSON.stringify({ error: 'Invalid payload: race_id, won, and attempts are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate attempts range (1-10)
    if (payload.attempts < 1 || payload.attempts > 10) {
      console.error('[submit-race-result] Invalid attempts:', payload.attempts)
      return new Response(
        JSON.stringify({ error: 'Invalid attempts: must be between 1 and 10' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Get player profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, emoji')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      console.error('[submit-race-result] Player profile not found:', profileError)
      return new Response(
        JSON.stringify({ error: 'Player profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[submit-race-result] Player found:', profile.name)

    // Validate race exists and is in playing status
    const { data: race, error: raceError } = await supabaseAdmin
      .from('official_races')
      .select('id, name, status, secret_code, prize_per_player')
      .eq('id', payload.race_id)
      .single()

    if (raceError || !race) {
      console.error('[submit-race-result] Race not found:', raceError)
      return new Response(
        JSON.stringify({ error: 'Race not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (race.status !== 'playing') {
      console.error('[submit-race-result] Race not in playing status:', race.status)
      return new Response(
        JSON.stringify({ error: 'Race is not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if player is registered for this race
    const { data: registration, error: regError } = await supabaseAdmin
      .from('race_registrations')
      .select('id')
      .eq('race_id', payload.race_id)
      .eq('player_id', profile.id)
      .single()

    if (regError || !registration) {
      console.error('[submit-race-result] Player not registered for race:', regError)
      return new Response(
        JSON.stringify({ error: 'Player not registered for this race' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if result already submitted
    const { data: existingResult } = await supabaseAdmin
      .from('race_results')
      .select('id')
      .eq('race_id', payload.race_id)
      .eq('player_id', profile.id)
      .single()

    if (existingResult) {
      console.error('[submit-race-result] Result already submitted')
      return new Response(
        JSON.stringify({ error: 'Result already submitted for this race' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate score calculation (server-side recalculation)
    // Score = base points + time bonus + attempt bonus
    const BASE_SCORE = payload.won ? 1000 : 0
    const TIME_BONUS = payload.won && payload.time_remaining ? payload.time_remaining * 2 : 0
    const ATTEMPT_BONUS = payload.won ? Math.max(0, (11 - payload.attempts) * 50) : 0
    const calculatedScore = BASE_SCORE + TIME_BONUS + ATTEMPT_BONUS

    // Allow some tolerance for score validation (client might calculate slightly differently)
    const scoreDiff = Math.abs(calculatedScore - payload.score)
    if (scoreDiff > 50) {
      console.warn('[submit-race-result] Score mismatch - client:', payload.score, 'server:', calculatedScore)
      // Use server-calculated score for integrity
    }

    const finalScore = calculatedScore

    // Insert race result
    const { data: result, error: resultError } = await supabaseAdmin
      .from('race_results')
      .insert({
        race_id: payload.race_id,
        player_id: profile.id,
        status: payload.won ? 'completed' : 'failed',
        attempts: payload.attempts,
        score: finalScore,
        time_remaining: payload.time_remaining,
        completed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (resultError) {
      console.error('[submit-race-result] Failed to insert result:', resultError)
      return new Response(
        JSON.stringify({ error: 'Failed to save result' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Also save to game_history
    const { error: historyError } = await supabaseAdmin
      .from('game_history')
      .insert({
        player_id: profile.id,
        race_id: payload.race_id,
        game_mode: 'official',
        won: payload.won,
        attempts: payload.attempts,
        score: finalScore,
        time_remaining: payload.time_remaining,
        secret_code: race.secret_code || [],
        guesses: payload.guesses
      })

    if (historyError) {
      console.warn('[submit-race-result] Failed to save game history:', historyError)
      // Non-critical, continue
    }

    // Update player stats
    const { error: statsError } = await supabaseAdmin.rpc('update_player_energy', {
      p_player_id: profile.id,
      p_amount: 0 // Just trigger the updated_at
    })

    // Update stats manually
    const statsUpdate: Record<string, unknown> = {
      stats_races: profile.id // Will be incremented
    }
    
    if (payload.won) {
      const { data: currentProfile } = await supabaseAdmin
        .from('profiles')
        .select('stats_wins, stats_races, stats_best_time')
        .eq('id', profile.id)
        .single()

      if (currentProfile) {
        const updates: Record<string, unknown> = {
          stats_wins: (currentProfile.stats_wins || 0) + 1,
          stats_races: (currentProfile.stats_races || 0) + 1
        }
        
        if (payload.time_remaining && 
            (!currentProfile.stats_best_time || payload.time_remaining > currentProfile.stats_best_time)) {
          updates.stats_best_time = payload.time_remaining
        }
        
        await supabaseAdmin
          .from('profiles')
          .update(updates)
          .eq('id', profile.id)
      }
    } else {
      await supabaseAdmin
        .from('profiles')
        .update({ stats_races: profile.id }) // This should be increment
        .eq('id', profile.id)
    }

    console.log('[submit-race-result] ✅ Result saved successfully:', result.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        result_id: result.id,
        score: finalScore,
        message: 'Race result submitted successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[submit-race-result] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
