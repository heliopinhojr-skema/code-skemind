/**
 * GuardianReferralTree - Árvore genealógica hierárquica de convites
 * Vincula por invite_code (invited_by armazena o código do convidador)
 * Mostra tier, saldo bloqueado/disponível, valor transferido e contagem por nível
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useReferralTree, ReferralNode } from '@/hooks/useGuardianData';
import { 
  Search, GitBranch, Users, ChevronRight, ChevronDown, 
  Zap, Shield, Star, Crown, Swords, Rocket, Gamepad2, ArrowDownRight, Lock, Unlock
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { calculateBalanceBreakdown, formatEnergy } from '@/lib/tierEconomy';

const TIER_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; short: string }> = {
  'master_admin': { label: 'CD HX', short: 'HX', icon: <Shield className="h-3 w-3" />, color: 'text-red-400 bg-red-400/10 border-red-400/30' },
  'Criador': { label: 'Criador', short: 'C', icon: <Star className="h-3 w-3" />, color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' },
  'Grão Mestre': { label: 'Grão Mestre', short: 'GM', icon: <Crown className="h-3 w-3" />, color: 'text-purple-400 bg-purple-400/10 border-purple-400/30' },
  'Mestre': { label: 'Mestre', short: 'M', icon: <Swords className="h-3 w-3" />, color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
  'Boom': { label: 'Boom', short: 'B', icon: <Rocket className="h-3 w-3" />, color: 'text-green-400 bg-green-400/10 border-green-400/30' },
  'Ploft': { label: 'Ploft', short: 'P', icon: <Gamepad2 className="h-3 w-3" />, color: 'text-muted-foreground bg-muted/30 border-border' },
  'jogador': { label: 'Ploft', short: 'P', icon: <Gamepad2 className="h-3 w-3" />, color: 'text-muted-foreground bg-muted/30 border-border' },
};

function getTierConfig(tier: string | null) {
  return TIER_CONFIG[tier || 'jogador'] || TIER_CONFIG['jogador'];
}

// Map from invite_code → children nodes
function buildChildrenMap(nodes: ReferralNode[]): Map<string, ReferralNode[]> {
  const map = new Map<string, ReferralNode[]>();
  for (const node of nodes) {
    if (node.invited_by) {
      const existing = map.get(node.invited_by) || [];
      existing.push(node);
      map.set(node.invited_by, existing);
    }
  }
  return map;
}

// Collect all descendants recursively
function collectDescendants(node: ReferralNode, childrenMap: Map<string, ReferralNode[]>): ReferralNode[] {
  const children = childrenMap.get(node.invite_code) || [];
  const result: ReferralNode[] = [...children];
  for (const child of children) {
    result.push(...collectDescendants(child, childrenMap));
  }
  return result;
}

interface TreeNodeProps {
  node: ReferralNode;
  childrenMap: Map<string, ReferralNode[]>;
  level: number;
  expandedNodes: Set<string>;
  toggleExpand: (id: string) => void;
}

function TreeNode({ node, childrenMap, level, expandedNodes, toggleExpand }: TreeNodeProps) {
  const children = childrenMap.get(node.invite_code) || [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedNodes.has(node.id);
  const tierConfig = getTierConfig(node.player_tier);
  const balance = calculateBalanceBreakdown(node.energy, node.player_tier, node.invites_sent);

  // Count all descendants
  const allDescendants = useMemo(() => 
    collectDescendants(node, childrenMap), 
    [node, childrenMap]
  );

  // Stats per tier in subtree
  const tierBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    allDescendants.forEach(d => {
      // Normalize 'jogador' → 'Ploft' for display grouping
      const tier = (d.player_tier === 'jogador' || !d.player_tier) ? 'Ploft' : d.player_tier;
      counts[tier] = (counts[tier] || 0) + 1;
    });
    return counts;
  }, [allDescendants]);

  return (
    <div className="relative">
      <div 
        className={cn(
          "flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group",
          level > 0 && "ml-6"
        )}
        onClick={() => hasChildren && toggleExpand(node.id)}
      >
        {/* Expand/collapse icon */}
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )
        ) : (
          <div className="w-4 shrink-0" />
        )}
        
        {/* Emoji + Name */}
        <span className="text-lg shrink-0">{node.emoji}</span>
        <span className="font-medium truncate">{node.name}</span>
        
        {/* Tier badge */}
        <Badge variant="outline" className={`text-[10px] border shrink-0 ${tierConfig.color}`}>
          <span className="flex items-center gap-0.5">
            {tierConfig.icon}
            {tierConfig.label}
          </span>
        </Badge>
        
        {/* Balance breakdown: total / locked / available */}
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="outline" className="text-[10px] font-mono">
            <Zap className="h-2.5 w-2.5 mr-0.5" />
            {formatEnergy(balance.total)}
          </Badge>
          {balance.locked > 0 && (
            <Badge variant="outline" className="text-[10px] font-mono text-orange-400 border-orange-400/30 bg-orange-400/5">
              <Lock className="h-2.5 w-2.5 mr-0.5" />
              {formatEnergy(balance.locked)}
            </Badge>
          )}
          {balance.maxInvites > 0 && (
            <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-400/30 bg-emerald-400/5">
              <Unlock className="h-2.5 w-2.5 mr-0.5" />
              {formatEnergy(balance.available)}
            </Badge>
          )}
        </div>
        
        {/* Invite code */}
        <code className="text-[10px] bg-muted px-1 py-0.5 rounded text-muted-foreground hidden sm:inline shrink-0">
          {node.invite_code}
        </code>
        
        {/* Invite slots: sent/max */}
        {balance.maxInvites > 0 && (
          <Badge variant="secondary" className="text-[10px] shrink-0">
            <Users className="h-2.5 w-2.5 mr-0.5" />
            {balance.invitesSent}/{balance.maxInvites}
          </Badge>
        )}
        
        {/* Transfer amount (how much this node distributed) */}
        {node.reward_transferred > 0 && (
          <Badge variant="outline" className="text-[10px] shrink-0 text-amber-400 border-amber-400/30 bg-amber-400/5">
            <ArrowDownRight className="h-2.5 w-2.5 mr-0.5" />
            {formatEnergy(node.reward_transferred)}
          </Badge>
        )}
        
        {/* Tier breakdown summary (compact) */}
        {hasChildren && !isExpanded && allDescendants.length > 0 && (
          <span className="text-[9px] text-muted-foreground ml-auto hidden md:flex gap-1 shrink-0">
            {Object.entries(tierBreakdown).map(([tier, count]) => {
              const tc = getTierConfig(tier);
              return (
                <span key={tier} className={`${tc.color.split(' ')[0]}`}>
                  {tc.short}:{count}
                </span>
              );
            })}
          </span>
        )}
        
        {/* Date */}
        <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
          {format(new Date(node.created_at), "dd/MM/yy", { locale: ptBR })}
        </span>
      </div>
      
      {hasChildren && isExpanded && (
        <div className="border-l border-border/30 ml-4">
          {children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              childrenMap={childrenMap}
              level={level + 1}
              expandedNodes={expandedNodes}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Summary card showing global tier breakdown
function TierSummary({ nodes }: { nodes: ReferralNode[] }) {
  const tierCounts = useMemo(() => {
    const counts: Record<string, { count: number; totalEnergy: number; totalLocked: number; totalAvailable: number; totalTransferred: number }> = {};
    nodes.forEach(n => {
      // Normalize 'jogador' → 'Ploft' for display grouping
      const tier = (n.player_tier === 'jogador' || !n.player_tier) ? 'Ploft' : n.player_tier;
      if (!counts[tier]) counts[tier] = { count: 0, totalEnergy: 0, totalLocked: 0, totalAvailable: 0, totalTransferred: 0 };
      const bal = calculateBalanceBreakdown(n.energy, n.player_tier, n.invites_sent);
      counts[tier].count++;
      counts[tier].totalEnergy += n.energy;
      counts[tier].totalLocked += bal.locked;
      counts[tier].totalAvailable += bal.available;
      counts[tier].totalTransferred += n.reward_transferred;
    });
    return counts;
  }, [nodes]);

  // 'jogador' is already merged into 'Ploft' above, so no separate entry needed
  const tierOrder = ['master_admin', 'Criador', 'Grão Mestre', 'Mestre', 'Boom', 'Ploft'];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
      {tierOrder.map(tier => {
        const data = tierCounts[tier];
        if (!data) return null;
        const tc = getTierConfig(tier);
        return (
          <div key={tier} className={`rounded-lg border p-2 text-center ${tc.color}`}>
            <div className="flex items-center justify-center gap-1 mb-1">
              {tc.icon}
              <span className="text-xs font-semibold">{tc.label}</span>
            </div>
            <div className="text-lg font-bold">{data.count}</div>
            <div className="text-[10px] opacity-80">
              {formatEnergy(data.totalEnergy)}
            </div>
            {data.totalLocked > 0 && (
              <div className="text-[9px] opacity-70 mt-0.5 flex items-center justify-center gap-0.5">
                <Lock className="h-2.5 w-2.5" />
                {formatEnergy(data.totalLocked)}
              </div>
            )}
            {data.totalAvailable > 0 && (
              <div className="text-[9px] opacity-70 flex items-center justify-center gap-0.5">
                <Unlock className="h-2.5 w-2.5" />
                {formatEnergy(data.totalAvailable)}
              </div>
            )}
            {data.totalTransferred > 0 && (
              <div className="text-[9px] opacity-60 mt-0.5">
                ↓ {formatEnergy(data.totalTransferred)} dist.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function GuardianReferralTree() {
  const { data: nodes, isLoading, error } = useReferralTree();
  const [search, setSearch] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Build children map based on invite_code ↔ invited_by
  const childrenMap = useMemo(() => {
    if (!nodes) return new Map<string, ReferralNode[]>();
    return buildChildrenMap(nodes);
  }, [nodes]);

  // Root nodes: those invited by master codes or with no matching inviter
  const rootNodes = useMemo(() => {
    if (!nodes) return [];
    
    const masterCodes = new Set(['SKEMA1', 'SKEMA2024', 'PRIMEIROSJOGADORES', 'BETATESTER', 'DEUSPAI']);
    const allInviteCodes = new Set(nodes.map(n => n.invite_code));
    
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      return nodes.filter(n => 
        n.name.toLowerCase().includes(searchLower) ||
        n.invite_code.toLowerCase().includes(searchLower) ||
        (n.player_tier || '').toLowerCase().includes(searchLower)
      );
    }
    
    return nodes.filter(n => {
      // No inviter → root
      if (!n.invited_by) return true;
      // Invited by a master code → root
      if (masterCodes.has(n.invited_by)) return true;
      // Invited by a code that doesn't match any current player → root
      if (!allInviteCodes.has(n.invited_by)) return true;
      return false;
    });
  }, [nodes, search]);

  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    if (nodes) setExpandedNodes(new Set(nodes.map(n => n.id)));
  };

  const collapseAll = () => setExpandedNodes(new Set());

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        Erro ao carregar árvore de convites: {error.message}
      </div>
    );
  }

  return (
    <Card className="bg-card/90 backdrop-blur-sm border-border/60">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Árvore Genealógica ({nodes?.length || 0})
          </CardTitle>
          <div className="flex items-center gap-2">
            <button 
              onClick={expandAll}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Expandir
            </button>
            <span className="text-muted-foreground">|</span>
            <button 
              onClick={collapseAll}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Colapsar
            </button>
            <div className="relative ml-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar jogador ou tier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full sm:w-48 bg-background/80"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <>
            {/* Resumo global por tier */}
            {nodes && nodes.length > 0 && !search && (
              <TierSummary nodes={nodes} />
            )}
            
            {rootNodes.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {search ? 'Nenhum jogador encontrado' : 'Nenhum jogador registrado'}
              </div>
            ) : (
              <div className="space-y-1">
                {rootNodes.map(node => (
                  <TreeNode
                    key={node.id}
                    node={node}
                    childrenMap={childrenMap}
                    level={0}
                    expandedNodes={expandedNodes}
                    toggleExpand={toggleExpand}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
