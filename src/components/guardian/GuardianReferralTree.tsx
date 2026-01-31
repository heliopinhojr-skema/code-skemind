/**
 * GuardianReferralTree - Visualização hierárquica de convites
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useReferralTree, ReferralNode } from '@/hooks/useGuardianData';
import { Search, GitBranch, Users, Gift, ChevronRight, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TreeNodeProps {
  node: ReferralNode;
  children: ReferralNode[];
  allNodes: ReferralNode[];
  level: number;
  expandedNodes: Set<string>;
  toggleExpand: (id: string) => void;
}

function TreeNode({ node, children, allNodes, level, expandedNodes, toggleExpand }: TreeNodeProps) {
  const hasChildren = children.length > 0;
  const isExpanded = expandedNodes.has(node.id);

  return (
    <div className="relative">
      <div 
        className={cn(
          "flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer",
          level > 0 && "ml-6"
        )}
        onClick={() => hasChildren && toggleExpand(node.id)}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )
        ) : (
          <div className="w-4" />
        )}
        
        <span className="text-lg">{node.emoji}</span>
        <span className="font-medium">{node.name}</span>
        
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
          {node.invite_code}
        </code>
        
        {node.total_invited > 0 && (
          <Badge variant="secondary" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            {node.total_invited}
          </Badge>
        )}
        
        {node.rewards_credited > 0 && (
          <Badge variant="outline" className="text-xs text-primary border-primary/30">
            <Gift className="h-3 w-3 mr-1" />
            {node.rewards_credited}
          </Badge>
        )}
        
        <span className="text-xs text-muted-foreground ml-auto">
          {format(new Date(node.created_at), "dd/MM/yy", { locale: ptBR })}
        </span>
      </div>
      
      {hasChildren && isExpanded && (
        <div className="border-l border-border/30 ml-4">
          {children.map(child => {
            const grandchildren = allNodes.filter(n => n.invited_by === child.id);
            return (
              <TreeNode
                key={child.id}
                node={child}
                children={grandchildren}
                allNodes={allNodes}
                level={level + 1}
                expandedNodes={expandedNodes}
                toggleExpand={toggleExpand}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function GuardianReferralTree() {
  const { data: nodes, isLoading, error } = useReferralTree();
  const [search, setSearch] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Encontrar nós raiz (sem inviter) ou filtrados
  const rootNodes = useMemo(() => {
    if (!nodes) return [];
    
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      return nodes.filter(n => 
        n.name.toLowerCase().includes(searchLower) ||
        n.invite_code.toLowerCase().includes(searchLower)
      );
    }
    
    return nodes.filter(n => !n.invited_by);
  }, [nodes, search]);

  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (nodes) {
      setExpandedNodes(new Set(nodes.map(n => n.id)));
    }
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

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
            Árvore de Convites ({nodes?.length || 0})
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
                placeholder="Buscar jogador..."
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
        ) : rootNodes.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {search ? 'Nenhum jogador encontrado' : 'Nenhum jogador registrado'}
          </div>
        ) : (
          <div className="space-y-1">
            {rootNodes.map(node => {
              const children = nodes?.filter(n => n.invited_by === node.id) || [];
              return (
                <TreeNode
                  key={node.id}
                  node={node}
                  children={children}
                  allNodes={nodes || []}
                  level={0}
                  expandedNodes={expandedNodes}
                  toggleExpand={toggleExpand}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
