/**
 * guardian-public-stats — Retorna métricas do dashboard Guardian para visualização pública read-only.
 * Protegido por token secreto na URL (sem autenticação de usuário).
 * Aceita chamadas anônimas (não exige JWT de usuário).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Token fixo para acesso público — pode ser alterado a qualquer momento
const PUBLIC_VIEW_TOKEN = "skm-view-2026-alpha";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Accept token from query param OR body
  let token: string | null = null;
  const url = new URL(req.url);
  token = url.searchParams.get("token");
  
  if (!token && req.method === "POST") {
    try {
      const body = await req.json();
      token = body?.token || null;
    } catch { /* ignore */ }
  }

  if (token !== PUBLIC_VIEW_TOKEN) {
    return new Response(JSON.stringify({ error: "Token inválido" }), {
      status: 403,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Fetch all stats in parallel
    const [
      { data: profiles },
      { data: skemaBox },
      { data: botTreasury },
      { data: referrals },
      { data: races },
      { data: arenas },
      { data: investorInterest },
    ] = await Promise.all([
      supabase.from("profiles").select("id, name, emoji, energy, player_tier, stats_wins, stats_races, stats_best_time, created_at, generation_color, status"),
      supabase.from("skema_box").select("balance").single(),
      supabase.from("bot_treasury").select("balance, bot_count, balance_per_bot").single(),
      supabase.from("referrals").select("id, inviter_id, invited_id, reward_amount, reward_credited, created_at"),
      supabase.from("official_races").select("id, name, status, scheduled_date, entry_fee, prize_per_player, min_players, max_players"),
      supabase.from("arena_listings").select("id, name, buy_in, status, difficulty, bot_count, total_entries, max_entries"),
      supabase.from("investor_interest").select("id, player_name, created_at"),
    ]);

    const allProfiles = profiles || [];
    const hxProfile = allProfiles.find((p: any) => p.player_tier === "master_admin");
    const playerProfiles = allProfiles.filter((p: any) => p.player_tier !== "master_admin");

    const totalPlayers = playerProfiles.length;
    const totalEnergy = playerProfiles.reduce((sum: number, p: any) => sum + (p.energy || 0), 0);
    const hxEnergy = hxProfile?.energy || 0;
    const skemaBoxBalance = skemaBox?.balance || 0;
    const botBalance = botTreasury?.balance || 0;
    const botCount = botTreasury?.bot_count || 99;
    const botPerBot = botTreasury?.balance_per_bot || 0;

    const totalReferrals = referrals?.length || 0;
    const creditedReferrals = referrals?.filter((r: any) => r.reward_credited).length || 0;
    const totalDistributed = referrals?.reduce((sum: number, r: any) => sum + (r.reward_amount || 0), 0) || 0;

    // Tier breakdown
    const tierCounts: Record<string, number> = {};
    playerProfiles.forEach((p: any) => {
      const tier = p.player_tier || "jogador";
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    });

    // Today's new players
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const newPlayersToday = playerProfiles.filter((p: any) => new Date(p.created_at) >= todayStart).length;

    // System total (should always = 10M)
    const systemTotal = hxEnergy + totalEnergy + skemaBoxBalance + botBalance;

    const stats = {
      totalPlayers,
      totalEnergy,
      hxEnergy,
      skemaBoxBalance,
      botTreasuryBalance: botBalance,
      botCount,
      botPerBot,
      totalReferrals,
      creditedReferrals,
      totalDistributed,
      totalRaces: races?.length || 0,
      totalArenas: arenas?.filter((a: any) => a.status === "open").length || 0,
      tierCounts,
      newPlayersToday,
      systemTotal,
      systemDelta: systemTotal - 10_000_000,
      investorCount: investorInterest?.length || 0,
      players: playerProfiles.map((p: any) => ({
        name: p.name,
        emoji: p.emoji,
        tier: p.player_tier,
        energy: p.energy,
        wins: p.stats_wins,
        races: p.stats_races,
        color: p.generation_color,
        status: p.status,
      })),
      races: races || [],
      arenas: arenas?.filter((a: any) => a.status === "open") || [],
      investors: investorInterest || [],
    };

    return new Response(JSON.stringify(stats), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
