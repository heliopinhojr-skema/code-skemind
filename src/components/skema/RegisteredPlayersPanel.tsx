/**
 * RegisteredPlayersPanel - Painel de jogadores registrados
 * 
 * Mostra:
 * - Jogadores inscritos no torneio oficial
 * - Todos os jogadores cadastrados no sistema
 * - Data de cadastro e status
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, Crown, Calendar, User, Trophy } from 'lucide-react';
import { OfficialRacePlayer } from '@/hooks/useOfficialRace';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Tipo para jogador do sistema (do localStorage)
interface SystemPlayer {
  id: string;
  name: string;
  emoji: string;
  inviteCode: string;
  invitedByName?: string;
  createdAt?: string;
}

interface RegisteredPlayersPanelProps {
  tournamentPlayers: OfficialRacePlayer[];
  currentPlayerId: string;
  maxPlayers: number;
}

// Lê todos os jogadores cadastrados do localStorage
function getAllRegisteredPlayers(): SystemPlayer[] {
  try {
    const accountsRaw = localStorage.getItem('skema_accounts');
    if (!accountsRaw) return [];
    
    const accounts = JSON.parse(accountsRaw) as Record<string, SystemPlayer>;
    return Object.values(accounts).map(acc => ({
      id: acc.id || '',
      name: acc.name || 'Jogador',
      emoji: acc.emoji || '🎮',
      inviteCode: acc.inviteCode || '',
      invitedByName: acc.invitedByName,
      createdAt: acc.createdAt,
    }));
  } catch (e) {
    console.error('[SKEMA] Erro ao ler jogadores:', e);
    return [];
  }
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

export function RegisteredPlayersPanel({
  tournamentPlayers,
  currentPlayerId,
  maxPlayers,
}: RegisteredPlayersPanelProps) {
  const systemPlayers = useMemo(() => getAllRegisteredPlayers(), []);
  
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="mx-4 mt-4"
    >
      <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 p-4 border-b border-white/10">
          <Users className="w-5 h-5 text-blue-400" />
          <span className="font-medium text-white">Jogadores do Universo SKEMA</span>
        </div>
        
        {/* Tabs - Torneio e Sistema */}
        <div className="p-4 space-y-4">
          {/* Inscritos no Torneio Oficial */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-yellow-400">
                Corrida Oficial ({tournamentPlayers.length}/{maxPlayers})
              </span>
            </div>
            
            <ScrollArea className="max-h-40">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/50 text-xs h-8">#</TableHead>
                    <TableHead className="text-white/50 text-xs h-8">Jogador</TableHead>
                    <TableHead className="text-white/50 text-xs h-8 text-right">Inscrito em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tournamentPlayers.length === 0 ? (
                    <TableRow className="border-white/10 hover:bg-white/5">
                      <TableCell colSpan={3} className="text-center text-white/40 text-sm py-4">
                        Nenhum inscrito ainda
                      </TableCell>
                    </TableRow>
                  ) : (
                    tournamentPlayers.map((player, idx) => (
                      <TableRow 
                        key={player.id}
                        className={`border-white/10 hover:bg-white/5 ${
                          player.id === currentPlayerId ? 'bg-green-500/10' : ''
                        }`}
                      >
                        <TableCell className="text-white/60 text-sm py-2">
                          {idx === 0 ? <Trophy className="w-4 h-4 text-yellow-400" /> : idx + 1}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-2">
                            <span>{player.emoji}</span>
                            <span className={`text-sm ${
                              player.id === currentPlayerId ? 'text-green-400 font-medium' : 'text-white'
                            }`}>
                              {player.name}
                            </span>
                            {player.id === currentPlayerId && (
                              <span className="text-xs text-green-400">(você)</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-white/50 text-xs text-right py-2">
                          {formatDate(player.registeredAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
          
          {/* Todos os jogadores cadastrados */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-cyan-400">
                Contas Cadastradas ({systemPlayers.length})
              </span>
            </div>
            
            <ScrollArea className="max-h-40">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/50 text-xs h-8">Jogador</TableHead>
                    <TableHead className="text-white/50 text-xs h-8">Código</TableHead>
                    <TableHead className="text-white/50 text-xs h-8 text-right">Convidado por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {systemPlayers.length === 0 ? (
                    <TableRow className="border-white/10 hover:bg-white/5">
                      <TableCell colSpan={3} className="text-center text-white/40 text-sm py-4">
                        Nenhuma conta cadastrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    systemPlayers.map((player) => (
                      <TableRow 
                        key={player.id}
                        className={`border-white/10 hover:bg-white/5 ${
                          player.id === currentPlayerId ? 'bg-green-500/10' : ''
                        }`}
                      >
                        <TableCell className="py-2">
                          <div className="flex items-center gap-2">
                            <span>{player.emoji}</span>
                            <span className={`text-sm ${
                              player.id === currentPlayerId ? 'text-green-400 font-medium' : 'text-white'
                            }`}>
                              {player.name}
                            </span>
                            {player.id === currentPlayerId && (
                              <span className="text-xs text-green-400">(você)</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-white/50 text-xs font-mono py-2">
                          {player.inviteCode}
                        </TableCell>
                        <TableCell className="text-white/50 text-xs text-right py-2">
                          {player.invitedByName || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
