import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TRANSFER_TAX = 0.0643; // 6.43%

/**
 * Transfer energy between players.
 * - Validates sender has enough AVAILABLE (unlocked) balance
 * - Charges 6.43% fee → goes to Skema Box
 * - Credits recipient atomically
 * - Only Grão Mestre and above can transfer
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body
    const { recipientNickname, amount } = await req.json();

    if (!recipientNickname || typeof recipientNickname !== "string") {
      return new Response(
        JSON.stringify({ error: "Nick do destinatário é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Valor inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Max precision: 2 decimal places
    const amountCents = Math.round(amount * 100);
    if (amountCents < 1) {
      return new Response(
        JSON.stringify({ error: "Valor mínimo: k$ 0,01" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client to get the sender
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client for atomic operations
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Get sender profile
    const { data: sender, error: senderErr } = await adminClient
      .from("profiles")
      .select("id, name, energy, player_tier, status, invite_code")
      .eq("user_id", user.id)
      .single();

    if (senderErr || !sender) {
      console.error("[transfer] Sender not found:", senderErr);
      return new Response(JSON.stringify({ error: "Perfil do remetente não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check sender is not blocked
    if (sender.status === "blocked") {
      return new Response(JSON.stringify({ error: "Conta bloqueada" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check sender tier >= Grão Mestre
    const allowedTiers = ["master_admin", "Criador", "Grão Mestre"];
    if (!allowedTiers.includes(sender.player_tier || "")) {
      return new Response(
        JSON.stringify({ error: "Apenas Grão Mestre e acima podem realizar transferências" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find recipient by nickname (case-insensitive)
    const { data: recipients, error: recipErr } = await adminClient
      .from("profiles")
      .select("id, name, energy, status")
      .ilike("name", recipientNickname.trim());

    if (recipErr || !recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: `Jogador "${recipientNickname}" não encontrado` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recipient = recipients[0];

    // Can't transfer to yourself
    if (recipient.id === sender.id) {
      return new Response(
        JSON.stringify({ error: "Não é possível transferir para si mesmo" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check recipient is active
    if (recipient.status === "blocked") {
      return new Response(
        JSON.stringify({ error: "Destinatário está bloqueado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate available balance (exclude locked balance for invites)
    // Tier economy config (must match tierEconomy.ts)
    const tierEconomy: Record<string, { maxInvites: number; costPerInvite: number; baseLocked: number }> = {
      master_admin: { maxInvites: 7, costPerInvite: 200000, baseLocked: 0 },
      Criador: { maxInvites: 10, costPerInvite: 15000, baseLocked: 0 },
      "Grão Mestre": { maxInvites: 10, costPerInvite: 1300, baseLocked: 0 },
      Mestre: { maxInvites: 10, costPerInvite: 130, baseLocked: 0 },
      Boom: { maxInvites: 10, costPerInvite: 10, baseLocked: 0 },
      Ploft: { maxInvites: 0, costPerInvite: 0, baseLocked: 2 },
      jogador: { maxInvites: 0, costPerInvite: 0, baseLocked: 2 },
    };

    const config = tierEconomy[sender.player_tier || "jogador"] || tierEconomy.jogador;

    // Count invites sent by this sender
    const { count: invitesSent } = await adminClient
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("inviter_id", sender.id);

    const slotsRemaining = Math.max(0, config.maxInvites - (invitesSent || 0));
    const inviteLocked = slotsRemaining * config.costPerInvite;
    const totalLocked = inviteLocked + config.baseLocked;
    const effectiveLocked = Math.min(totalLocked, Number(sender.energy));
    const availableBalance = Math.max(0, Number(sender.energy) - effectiveLocked);

    // Calculate costs in cents for precision
    const taxCents = Math.round(amountCents * TRANSFER_TAX);
    const totalCostCents = amountCents + taxCents;
    const availableCents = Math.round(availableBalance * 100);

    console.log(`[transfer] ${sender.name} → ${recipient.name}: k$ ${(amountCents / 100).toFixed(2)} + tax k$ ${(taxCents / 100).toFixed(2)} = k$ ${(totalCostCents / 100).toFixed(2)}`);
    console.log(`[transfer] Available: k$ ${(availableCents / 100).toFixed(2)} (total: k$ ${sender.energy}, locked: k$ ${effectiveLocked.toFixed(2)})`);

    if (availableCents < totalCostCents) {
      const needed = (totalCostCents / 100).toFixed(2);
      const avail = (availableCents / 100).toFixed(2);
      return new Response(
        JSON.stringify({
          error: `Saldo disponível insuficiente. Necessário: k$ ${needed} (valor + taxa 6,43%), disponível: k$ ${avail}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === ATOMIC OPERATIONS ===

    // 1. Debit sender
    const totalDebit = totalCostCents / 100;
    const { error: debitErr } = await adminClient
      .from("profiles")
      .update({
        energy: Number(sender.energy) - totalDebit,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sender.id);

    if (debitErr) {
      console.error("[transfer] Debit failed:", debitErr);
      return new Response(
        JSON.stringify({ error: "Erro ao debitar remetente" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Credit recipient
    const creditAmount = amountCents / 100;
    const { error: creditErr } = await adminClient
      .from("profiles")
      .update({
        energy: Number(recipient.energy) + creditAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recipient.id);

    if (creditErr) {
      console.error("[transfer] Credit failed, reverting debit:", creditErr);
      // Revert sender
      await adminClient
        .from("profiles")
        .update({ energy: Number(sender.energy), updated_at: new Date().toISOString() })
        .eq("id", sender.id);
      return new Response(
        JSON.stringify({ error: "Erro ao creditar destinatário" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Send tax to Skema Box
    const taxAmount = taxCents / 100;
    if (taxCents > 0) {
      try {
        await adminClient.rpc("update_skema_box", {
          p_amount: taxAmount,
          p_type: "transfer_tax",
          p_description: `Taxa transf. ${sender.name} → ${recipient.name}: k$ ${creditAmount.toFixed(2)}`,
        });
        console.log(`[transfer] Tax k$ ${taxAmount.toFixed(2)} → Skema Box`);
      } catch (taxErr) {
        console.error("[transfer] Tax to Skema Box failed (non-critical):", taxErr);
      }
    }

    console.log(`[transfer] ✅ Success: ${sender.name} → ${recipient.name} k$ ${creditAmount.toFixed(2)} (tax: k$ ${taxAmount.toFixed(2)})`);

    return new Response(
      JSON.stringify({
        success: true,
        transferred: creditAmount,
        tax: taxAmount,
        totalDebited: totalDebit,
        recipientName: recipient.name,
        senderNewBalance: Number(sender.energy) - totalDebit,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[transfer] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
