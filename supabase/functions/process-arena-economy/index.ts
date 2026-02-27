import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

/**
 * process-arena-economy v2
 * 
 * ALL economy is now processed ATOMICALLY at finish time.
 * The 'enter' action only VALIDATES that the player + bot treasury
 * have enough balance, but does NOT debit anything.
 * This prevents "lost pools" when a player disconnects mid-game.
 *
 * action: 'enter'
 *   - Validates player has enough energy for buy_in
 *   - Validates bot treasury has enough for (bot_count × buy_in)
 *   - Returns the pool amount (NO debits)
 * 
 * action: 'finish'
 *   - Debits player energy (buy_in)
 *   - Debits bot buy-ins from bot_treasury (bot_count × buy_in)
 *   - Credits rake to skema_box ((bot_count + 1) × rake_fee)
 *   - Credits player prize (if ITM)
 *   - Credits bot prizes to bot_treasury
 *   - Net effect on player: -buy_in + prize
 *   - Net effect on bot_treasury: -(bot_count × buy_in) + bot_prizes
 *   - Net effect on skema_box: +total_rake
 */

interface EnterPayload {
  action: 'enter'
  buy_in: number
  rake_fee: number
  bot_count: number
  arena_id?: string
}

interface FinishPayload {
  action: 'finish'
  buy_in: number
  rake_fee: number
  bot_count: number
  player_rank: number
  player_prize: number
  bot_prizes_total: number
  arena_id?: string
  attempts: number
  score: number
  time_remaining: number | null
  won: boolean
  arena_buy_in?: number
  arena_pool?: number
}

type Payload = EnterPayload | FinishPayload

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[arena-economy] Missing Authorization header')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // User client for auth validation
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      console.error('[arena-economy] Invalid JWT:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Admin client for atomic operations
    const admin = createClient(supabaseUrl, supabaseServiceKey)

    // Get player profile
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, name, energy, status')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('[arena-economy] Profile not found:', profileError)
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (profile.status === 'blocked') {
      return new Response(
        JSON.stringify({ error: 'Account blocked' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload: Payload = await req.json()
    console.log('[arena-economy] Action:', payload.action, 'Player:', profile.name)

    // ======================== ENTER (validate only, no debits) ========================
    if (payload.action === 'enter') {
      const { buy_in, rake_fee, bot_count } = payload as EnterPayload

      // Validate params
      if (buy_in <= 0 || rake_fee < 0 || bot_count < 1) {
        return new Response(
          JSON.stringify({ error: 'Invalid arena parameters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check player has enough energy
      if (Number(profile.energy) < buy_in) {
        console.error('[arena-economy] Insufficient energy:', profile.energy, '< buy_in:', buy_in)
        return new Response(
          JSON.stringify({ error: 'Energia insuficiente', required: buy_in, current: profile.energy }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check bot treasury has enough
      const { data: treasury, error: treasuryError } = await admin
        .from('bot_treasury')
        .select('balance')
        .eq('id', '00000000-0000-0000-0000-000000000002')
        .single()

      if (treasuryError || !treasury) {
        console.error('[arena-economy] Bot treasury not found:', treasuryError)
        return new Response(
          JSON.stringify({ error: 'Bot treasury not found' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const botTotalBuyIn = bot_count * buy_in
      if (Number(treasury.balance) < botTotalBuyIn) {
        console.error('[arena-economy] Bot treasury insufficient:', treasury.balance, '< needed:', botTotalBuyIn)
        return new Response(
          JSON.stringify({ error: 'Bot treasury insufficient funds' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // ✅ Validation passed — return pool WITHOUT debiting anything
      const totalPool = (bot_count + 1) * (buy_in - rake_fee)
      console.log(`[arena-economy] ✅ ENTER validated (NO debits). Pool: k$${totalPool.toFixed(2)}, Player: ${profile.name}`)

      return new Response(
        JSON.stringify({
          success: true,
          player_energy: Number(profile.energy), // unchanged
          bot_treasury_balance: Number(treasury.balance), // unchanged
          total_pool: totalPool,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ======================== FINISH (ALL economy here) ========================
    if (payload.action === 'finish') {
      const { 
        buy_in, rake_fee, bot_count,
        player_rank, player_prize, bot_prizes_total, 
        attempts, score, time_remaining, won, 
        arena_buy_in, arena_pool 
      } = payload as FinishPayload

      // Validate buy_in/rake_fee/bot_count are present
      if (!buy_in || buy_in <= 0 || !bot_count || bot_count < 1) {
        console.error('[arena-economy] FINISH missing arena params:', { buy_in, rake_fee, bot_count })
        return new Response(
          JSON.stringify({ error: 'Missing arena parameters in finish' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const botTotalBuyIn = bot_count * buy_in
      const totalRake = (bot_count + 1) * (rake_fee || 0)

      // Re-validate player balance (might have changed)
      if (Number(profile.energy) < buy_in) {
        console.error('[arena-economy] FINISH: Player energy dropped below buy_in during game')
        return new Response(
          JSON.stringify({ error: 'Energia insuficiente para finalizar arena' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Re-validate bot treasury
      const { data: treasury } = await admin
        .from('bot_treasury')
        .select('balance')
        .eq('id', '00000000-0000-0000-0000-000000000002')
        .single()

      if (!treasury || Number(treasury.balance) < botTotalBuyIn) {
        console.error('[arena-economy] FINISH: Bot treasury insufficient for buy-ins')
        return new Response(
          JSON.stringify({ error: 'Bot treasury insufficient' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // ── Step 1: Debit player buy-in ──
      const { error: playerDebitError } = await admin.rpc('update_player_energy', {
        p_player_id: profile.id,
        p_amount: -buy_in,
      })
      if (playerDebitError) {
        console.error('[arena-economy] Player debit failed:', playerDebitError)
        return new Response(
          JSON.stringify({ error: 'Failed to debit player' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.log(`[arena-economy] ✅ Player debited: -k$${buy_in.toFixed(2)}`)

      // ── Step 2: Debit bot treasury (buy-ins) ──
      const { data: newBotBalanceAfterDebit, error: botDebitError } = await admin.rpc('update_bot_treasury', {
        p_amount: -botTotalBuyIn,
        p_description: `Arena entry: ${bot_count} bots × k$${buy_in.toFixed(2)}`,
      })
      if (botDebitError) {
        console.error('[arena-economy] Bot treasury debit failed:', botDebitError)
        // Rollback player
        await admin.rpc('update_player_energy', { p_player_id: profile.id, p_amount: buy_in })
        return new Response(
          JSON.stringify({ error: 'Failed to debit bot treasury' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.log(`[arena-economy] ✅ Bot treasury debited: -k$${botTotalBuyIn.toFixed(2)}`)

      // ── Step 3: Credit rake to Skema Box ──
      const { data: newBoxBalance, error: rakeError } = await admin.rpc('update_skema_box', {
        p_amount: totalRake,
        p_type: 'arena_rake',
        p_description: `Arena rake: ${bot_count + 1} players × k$${(rake_fee || 0).toFixed(2)}`,
      })
      if (rakeError) {
        console.error('[arena-economy] Skema box credit failed:', rakeError)
        // Rollback
        await admin.rpc('update_player_energy', { p_player_id: profile.id, p_amount: buy_in })
        await admin.rpc('update_bot_treasury', { p_amount: botTotalBuyIn })
        return new Response(
          JSON.stringify({ error: 'Failed to credit rake' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.log(`[arena-economy] ✅ Skema Box rake credited: +k$${totalRake.toFixed(2)}`)

      // ── Step 4: Credit player prize (if any) ──
      if (player_prize > 0) {
        const { error: prizeError } = await admin.rpc('update_player_energy', {
          p_player_id: profile.id,
          p_amount: player_prize,
        })
        if (prizeError) {
          console.error('[arena-economy] Player prize credit failed:', prizeError)
          return new Response(
            JSON.stringify({ error: 'Failed to credit player prize' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        console.log(`[arena-economy] ✅ Player prize credited: +k$${player_prize.toFixed(2)} (rank #${player_rank})`)
      } else {
        console.log(`[arena-economy] Player finished rank #${player_rank} - no prize`)
      }

      // ── Step 5: Credit bot prizes back to treasury ──
      if (bot_prizes_total > 0) {
        const { data: newBotBalance, error: botCreditError } = await admin.rpc('update_bot_treasury', {
          p_amount: bot_prizes_total,
          p_description: `Arena prizes: bots won k$${bot_prizes_total.toFixed(2)}`,
        })
        if (botCreditError) {
          console.error('[arena-economy] Bot treasury credit failed:', botCreditError)
          return new Response(
            JSON.stringify({ error: 'Failed to credit bot treasury' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        console.log(`[arena-economy] ✅ Bot treasury credited: +k$${bot_prizes_total.toFixed(2)} (new balance: k$${newBotBalance})`)
      }

      // ── Step 6: Save game history ──
      const { error: historyError } = await admin
        .from('game_history')
        .insert({
          player_id: profile.id,
          game_mode: 'arena',
          won,
          attempts,
          score,
          time_remaining,
          rank: player_rank,
          prize_won: player_prize,
          arena_buy_in: arena_buy_in ?? buy_in,
          arena_pool: arena_pool ?? null,
        })
      if (historyError) {
        console.warn('[arena-economy] Game history save failed (non-critical):', historyError)
      }

      // ── Step 7: Update player stats ──
      const { data: currentProfile } = await admin
        .from('profiles')
        .select('stats_wins, stats_races, stats_best_time')
        .eq('id', profile.id)
        .single()

      if (currentProfile) {
        const updates: Record<string, unknown> = {
          stats_races: (currentProfile.stats_races || 0) + 1,
        }
        if (won) {
          updates.stats_wins = (currentProfile.stats_wins || 0) + 1
          if (time_remaining && (!currentProfile.stats_best_time || time_remaining > Number(currentProfile.stats_best_time))) {
            updates.stats_best_time = time_remaining
          }
        }
        await admin.from('profiles').update(updates).eq('id', profile.id)
      }

      // Get updated energy
      const { data: updatedProfile } = await admin
        .from('profiles')
        .select('energy')
        .eq('id', profile.id)
        .single()

      // Log summary
      const netPlayer = -buy_in + player_prize
      const netBots = -botTotalBuyIn + bot_prizes_total
      console.log(`[arena-economy] ✅ FINISH complete. Net player: ${netPlayer >= 0 ? '+' : ''}k$${netPlayer.toFixed(2)}, Net bots: ${netBots >= 0 ? '+' : ''}k$${netBots.toFixed(2)}, Rake: +k$${totalRake.toFixed(2)}`)

      return new Response(
        JSON.stringify({
          success: true,
          player_rank,
          player_prize,
          bot_prizes_total,
          player_energy: updatedProfile ? Number(updatedProfile.energy) : null,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[arena-economy] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
