/**
 * tierEconomy.ts - Cálculos de saldo bloqueado/disponível por tier
 * 
 * Cada tier tem um limite de convites e um custo por convite.
 * O saldo bloqueado = (max_convites - convites_realizados) × custo_por_convite
 * O saldo disponível = saldo_total - saldo_bloqueado
 */

export interface TierEconomyConfig {
  maxInvites: number;
  costPerInvite: number;
  invitedTierLabel: string;
}

/** Configuração econômica por tier do convidador */
const TIER_ECONOMY: Record<string, TierEconomyConfig> = {
  'master_admin': { maxInvites: 7, costPerInvite: 200_000, invitedTierLabel: 'Criador' },
  'CD HX':        { maxInvites: 7, costPerInvite: 200_000, invitedTierLabel: 'Criador' },
  'Criador':      { maxInvites: 10, costPerInvite: 15_000, invitedTierLabel: 'Grão Mestre' },
  'Grão Mestre':  { maxInvites: 10, costPerInvite: 1_500, invitedTierLabel: 'Mestre' },
  'Mestre':       { maxInvites: 10, costPerInvite: 130, invitedTierLabel: 'Boom' },
  'Boom':         { maxInvites: 10, costPerInvite: 10, invitedTierLabel: 'Ploft' },
  'Ploft':        { maxInvites: 0, costPerInvite: 0, invitedTierLabel: '' },
  'jogador':      { maxInvites: 0, costPerInvite: 0, invitedTierLabel: '' },
};

export function getTierEconomy(tier: string | null): TierEconomyConfig {
  return TIER_ECONOMY[tier || 'jogador'] || TIER_ECONOMY['jogador'];
}

export interface BalanceBreakdown {
  /** Saldo total do jogador */
  total: number;
  /** Saldo bloqueado para convites futuros (slots restantes × custo) */
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
  const locked = slotsRemaining * config.costPerInvite;
  // Locked can't exceed total energy
  const effectiveLocked = Math.min(locked, energy);
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
  };
}

/**
 * Formata valor de energia no padrão monetário brasileiro: k$ 200.000,00
 */
export function formatEnergy(energy: number): string {
  return `k$ ${energy.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
