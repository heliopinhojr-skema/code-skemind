/**
 * tierEconomy.ts - Cálculos de saldo bloqueado/disponível por tier
 * 
 * Cada tier tem um limite de convites e um custo por convite.
 * O saldo bloqueado = (max_convites - convites_realizados) × custo_por_convite + baseLocked
 * O saldo disponível = saldo_total - saldo_bloqueado
 * 
 * Ploft: sem convites, mas k$2 bloqueados como reserva, k$8 livre pra jogar.
 */

export interface TierEconomyConfig {
  maxInvites: number;
  costPerInvite: number;
  invitedTierLabel: string;
  /** Saldo base bloqueado (independente de convites). Ex: Ploft = 2 */
  baseLocked: number;
}

/** Configuração econômica por tier do convidador */
const TIER_ECONOMY: Record<string, TierEconomyConfig> = {
  'master_admin': { maxInvites: 10, costPerInvite: 200_000, invitedTierLabel: 'Criador', baseLocked: 0 },
  'CD HX':        { maxInvites: 10, costPerInvite: 200_000, invitedTierLabel: 'Criador', baseLocked: 0 },
  'Criador':      { maxInvites: 10, costPerInvite: 15_000, invitedTierLabel: 'Grão Mestre', baseLocked: 0 },
  'Grão Mestre':  { maxInvites: 10, costPerInvite: 1_300, invitedTierLabel: 'Mestre', baseLocked: 0 },
  'Mestre':       { maxInvites: 10, costPerInvite: 130, invitedTierLabel: 'Boom', baseLocked: 0 },
  'Boom':         { maxInvites: 10, costPerInvite: 10, invitedTierLabel: 'Ploft', baseLocked: 0 },
  'Ploft':        { maxInvites: 0, costPerInvite: 0, invitedTierLabel: '', baseLocked: 2 },
  'jogador':      { maxInvites: 0, costPerInvite: 0, invitedTierLabel: '', baseLocked: 2 },
};

export function getTierEconomy(tier: string | null): TierEconomyConfig {
  return TIER_ECONOMY[tier || 'jogador'] || TIER_ECONOMY['jogador'];
}

export interface BalanceBreakdown {
  /** Saldo total do jogador */
  total: number;
  /** Saldo bloqueado para convites futuros + reserva base */
  locked: number;
  /** Saldo livre para uso (corridas, apostas, etc.) */
  available: number;
  /** Convites já enviados */
  invitesSent: number;
  /** Máximo de convites permitidos */
  maxInvites: number;
  /** Slots de convite restantes */
  slotsRemaining: number;
  /** Custo por convite */
  costPerInvite: number;
  /** Tier que será criado ao convidar */
  invitedTierLabel: string;
  /** Reserva base bloqueada (ex: Ploft = 2) */
  baseLocked: number;
}

/**
 * Calcula o breakdown de saldo bloqueado/disponível para um jogador
 */
export function calculateBalanceBreakdown(
  energy: number,
  tier: string | null,
  invitesSent: number
): BalanceBreakdown {
  const config = getTierEconomy(tier);
  const slotsRemaining = Math.max(0, config.maxInvites - invitesSent);
  const inviteLocked = slotsRemaining * config.costPerInvite;
  const totalLocked = inviteLocked + config.baseLocked;
  // Locked can't exceed total energy
  const effectiveLocked = Math.min(totalLocked, energy);
  const available = Math.max(0, energy - effectiveLocked);

  return {
    total: energy,
    locked: effectiveLocked,
    available,
    invitesSent,
    maxInvites: config.maxInvites,
    slotsRemaining,
    costPerInvite: config.costPerInvite,
    invitedTierLabel: config.invitedTierLabel,
    baseLocked: config.baseLocked,
  };
}

/**
 * Formata valor de energia no padrão monetário brasileiro: k$ 200.000,00
 */
export function formatEnergy(energy: number): string {
  return `k$ ${energy.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
