/**
 * GuardianSkemaBox - Saldo e transações do Skema Box
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useSkemaBoxBalance, useSkemaBoxTransactions } from '@/hooks/useGuardianData';
import { Box, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function GuardianSkemaBox() {
  const { data: balance, isLoading: balanceLoading } = useSkemaBoxBalance();
  const { data: transactions, isLoading: transactionsLoading, error } = useSkemaBoxTransactions();

  // Agregar por tipo
  const aggregatedByType = useMemo(() => {
    if (!transactions) return new Map<string, number>();
    
    const map = new Map<string, number>();
    transactions.forEach(t => {
      const current = map.get(t.type) || 0;
      map.set(t.type, current + t.amount);
    });
    return map;
  }, [transactions]);

  const typeLabels: Record<string, string> = {
    official_rake: 'Taxa Corridas Oficiais',
    arena_rake: 'Taxa Arena',
    referral_reward: 'Recompensas Convites',
    prize_payout: 'Pagamento Prêmios',
  };

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        Erro ao carregar Skema Box: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Saldo atual */}
      <Card className="bg-card/90 backdrop-blur-sm border-border/60">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Box className="h-5 w-5" />
            Skema Box
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
              <div className="text-sm text-muted-foreground mb-1">Saldo Atual</div>
              {balanceLoading ? (
                <Skeleton className="h-10 w-24" />
              ) : (
                <div className="text-3xl font-bold text-primary">
                  k${Number(balance?.balance || 0).toFixed(2)}
                </div>
              )}
              {balance?.updated_at && (
                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Atualizado: {format(new Date(balance.updated_at), "dd/MM HH:mm", { locale: ptBR })}
                </div>
              )}
            </div>
            
            {/* Totais por tipo */}
            <div className="md:col-span-2 grid grid-cols-2 gap-2">
              {Array.from(aggregatedByType.entries()).map(([type, total]) => (
                <div key={type} className="bg-muted/30 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">
                    {typeLabels[type] || type}
                  </div>
                  <div className={`text-lg font-semibold flex items-center gap-1 ${total >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {total >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    k${Math.abs(total).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de transações */}
      <Card className="bg-card/90 backdrop-blur-sm border-border/60">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Histórico de Transações ({transactions?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Saldo Após</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-6 w-20" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : transactions?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhuma transação registrada
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions?.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(tx.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {typeLabels[tx.type] || tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {tx.description || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-mono ${tx.amount >= 0 ? 'text-primary' : 'text-destructive'}`}>
                          {tx.amount >= 0 ? '+' : ''}k${tx.amount.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono text-muted-foreground">
                          k${tx.balance_after.toFixed(2)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
