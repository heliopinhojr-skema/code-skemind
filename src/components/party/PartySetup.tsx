/**
 * PartySetup - Tela de configuração do Modo Festa
 * 
 * Anfitrião adiciona jogadores manualmente antes de iniciar
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Plus, X, Rocket, PartyPopper, Zap, Trophy,
  AlertCircle, Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PartyTournament } from '@/hooks/usePartyTournament';

interface PartySetupProps {
  tournament: PartyTournament;
  hostEnergy: number;
  onAddPlayer: (name: string, emoji: string) => { success: boolean; error?: string };
  onRemovePlayer: (playerId: string) => boolean;
  onStart: () => { success: boolean; error?: string };
  onCancel: () => void;
}

// Emojis disponíveis para jogadores
const PLAYER_EMOJIS = ['🎮', '🚀', '⭐', '🔥', '💎', '🎯', '🏆', '👑', '🌟', '⚡'];

export function PartySetup({
  tournament,
  hostEnergy,
  onAddPlayer,
  onRemovePlayer,
  onStart,
  onCancel,
}: PartySetupProps) {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(PLAYER_EMOJIS[0]);
  const [error, setError] = useState<string | null>(null);

  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) {
      setError('Digite o nome do jogador');
      return;
    }
    
    const result = onAddPlayer(newPlayerName.trim(), selectedEmoji);
    if (result.success) {
      setNewPlayerName('');
      setSelectedEmoji(PLAYER_EMOJIS[Math.floor(Math.random() * PLAYER_EMOJIS.length)]);
      setError(null);
    } else {
      setError(result.error || 'Erro ao adicionar');
    }
  };

  const handleStart = () => {
    const result = onStart();
    if (!result.success) {
      setError(result.error || 'Erro ao iniciar');
    }
  };

  const totalPool = tournament.entryFee * tournament.players.length * (1 - 0.0643);
  const prizes = [
    totalPool * 0.50,
    totalPool * 0.25,
    totalPool * 0.15,
    totalPool * 0.10,
  ];

  const canStart = tournament.players.length >= 2 && hostEnergy >= tournament.entryFee;

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900/20 to-black p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500/20 to-purple-500/20 px-4 py-2 rounded-full border border-pink-500/30 mb-3">
            <PartyPopper className="w-5 h-5 text-pink-400" />
            <span className="text-pink-300 font-medium">Modo Festa</span>
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-1">{tournament.name}</h1>
          <p className="text-sm text-white/60">Código: <span className="font-mono text-primary">{tournament.id}</span></p>
        </motion.div>

        {/* Info do Torneio */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4"
        >
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-yellow-400">k${tournament.entryFee.toFixed(2)}</div>
              <div className="text-xs text-white/50">Entrada/jogador</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">k${totalPool.toFixed(2)}</div>
              <div className="text-xs text-white/50">Pool de prêmios</div>
            </div>
          </div>
          
          {/* Prêmios */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="text-xs text-white/50 mb-2">Distribuição de prêmios (top 4):</div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {prizes.map((prize, i) => (
                <div key={i} className="bg-black/20 rounded-lg p-2">
                  <div className="text-lg">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '4️⃣'}
                  </div>
                  <div className="text-yellow-400 font-medium">k${prize.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Lista de Jogadores */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-white">Jogadores</span>
            </div>
            <span className="text-xs text-white/50">
              {tournament.players.length}/{tournament.maxPlayers}
            </span>
          </div>
          
          <div className="space-y-2 mb-4">
            <AnimatePresence>
              {tournament.players.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`
                    flex items-center justify-between p-3 rounded-lg
                    ${player.id === tournament.hostId 
                      ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30' 
                      : 'bg-black/30'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{player.emoji}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{player.name}</span>
                        {player.id === tournament.hostId && (
                          <Crown className="w-4 h-4 text-yellow-400" />
                        )}
                      </div>
                      <div className="text-xs text-white/50">#{index + 1}</div>
                    </div>
                  </div>
                  
                  {player.id !== tournament.hostId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemovePlayer(player.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          {/* Adicionar jogador */}
          {tournament.players.length < tournament.maxPlayers && (
            <div className="space-y-3">
              <div className="flex gap-2">
                {PLAYER_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => setSelectedEmoji(emoji)}
                    className={`
                      w-8 h-8 rounded-lg text-lg transition-all
                      ${selectedEmoji === emoji 
                        ? 'bg-primary/30 ring-2 ring-primary' 
                        : 'bg-white/5 hover:bg-white/10'
                      }
                    `}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Input
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Nome do jogador"
                  className="flex-1 bg-black/30 border-white/20"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
                />
                <Button onClick={handleAddPlayer} className="gap-1">
                  <Plus className="w-4 h-4" />
                  Adicionar
                </Button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Erro */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4 flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-300">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Aviso de energia */}
        {hostEnergy < tournament.entryFee && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 mb-4 flex items-center gap-2"
          >
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-yellow-300">
              Você precisa de k${tournament.entryFee.toFixed(2)} para iniciar
            </span>
          </motion.div>
        )}

        {/* Botões */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 border-white/20 text-white hover:bg-white/10"
          >
            Cancelar
          </Button>
          
          <Button
            onClick={handleStart}
            disabled={!canStart}
            className="flex-1 gap-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
          >
            <Rocket className="w-4 h-4" />
            Iniciar Festa!
          </Button>
        </div>

        <p className="text-xs text-center text-white/40 mt-4">
          Cada jogador joga no seu celular e reporta o resultado
        </p>
      </div>
    </div>
  );
}
