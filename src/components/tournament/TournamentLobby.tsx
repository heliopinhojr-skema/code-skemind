/**
 * TournamentLobby - Tela de lobby mobile-first
 * 
 * Mostra:
 * - Saldo de K$
 * - Lista de jogadores (1 humano + 9 bots)
 * - Countdown de 10s antes de iniciar
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Trophy, Coins, Play, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TournamentPlayer } from '@/hooks/useTournament';

interface TournamentLobbyProps {
  players: TournamentPlayer[];
  credits: number;
  entryFee: number;
  prizePool: number;
  onStart: () => { success: boolean; error?: string; humanSecretCode?: string[] };
}

const COUNTDOWN_SECONDS = 10;

export function TournamentLobby({
  players,
  credits,
  entryFee,
  prizePool,
  onStart,
}: TournamentLobbyProps) {
  const canAfford = credits >= entryFee;
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  
  // Inicia countdown
  const handleStartCountdown = useCallback(() => {
    if (!canAfford || isStarting) return;
    setIsStarting(true);
    setCountdown(COUNTDOWN_SECONDS);
  }, [canAfford, isStarting]);
  
  // Cancela countdown
  const handleCancelCountdown = useCallback(() => {
    setIsStarting(false);
    setCountdown(null);
  }, []);
  
  // Timer do countdown
  useEffect(() => {
    if (countdown === null || countdown < 0) return;
    
    if (countdown === 0) {
      // Countdown terminou - inicia o torneio
      const result = onStart();
      if (!result.success && result.error) {
        console.error(result.error);
        setIsStarting(false);
        setCountdown(null);
      }
      return;
    }
    
    const timer = setTimeout(() => {
      setCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [countdown, onStart]);
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 p-4">
      {/* Header com saldo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          Torneio
        </h1>
        
        <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-4 py-2 rounded-full border border-yellow-500/30">
          <Coins className="w-5 h-5 text-yellow-500" />
          <span className="font-bold text-lg">{credits.toLocaleString()} K$</span>
        </div>
      </motion.div>
      
      {/* Countdown overlay */}
      <AnimatePresence>
        {isStarting && countdown !== null && countdown > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center"
          >
            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <div className="text-8xl font-black text-primary mb-4 tabular-nums">
                {countdown}
              </div>
              <div className="text-xl text-muted-foreground mb-8">
                Preparando torneio...
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                variant="outline"
                onClick={handleCancelCountdown}
                className="text-muted-foreground"
              >
                Cancelar
              </Button>
            </motion.div>
            
            {/* Progress bar */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-64">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: COUNTDOWN_SECONDS, ease: 'linear' }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Info do torneio */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-card border rounded-xl p-4 mb-6 space-y-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Taxa de entrada</span>
          <span className="font-bold text-red-400">-{entryFee} K$</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Premiação total</span>
          <span className="font-bold text-green-400">{prizePool.toLocaleString()} K$</span>
        </div>
        <div className="border-t pt-3">
          <div className="text-sm text-muted-foreground mb-2">Prêmios:</div>
          <div className="grid grid-cols-4 gap-2 text-center text-sm">
            <div className="bg-yellow-500/20 rounded-lg py-2">
              <div className="text-yellow-500">🥇 1º</div>
              <div className="font-bold">{Math.floor(prizePool * 0.5)}</div>
            </div>
            <div className="bg-gray-400/20 rounded-lg py-2">
              <div className="text-gray-400">🥈 2º</div>
              <div className="font-bold">{Math.floor(prizePool * 0.25)}</div>
            </div>
            <div className="bg-orange-600/20 rounded-lg py-2">
              <div className="text-orange-400">🥉 3º</div>
              <div className="font-bold">{Math.floor(prizePool * 0.15)}</div>
            </div>
            <div className="bg-muted rounded-lg py-2">
              <div className="text-muted-foreground">4º</div>
              <div className="font-bold">{Math.floor(prizePool * 0.1)}</div>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Lista de jogadores */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-primary" />
          <span className="font-semibold">Jogadores ({players.length}/10)</span>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {players.map((player, index) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              className={`
                flex items-center gap-3 p-3 rounded-lg border
                ${player.isBot 
                  ? 'bg-muted/50 border-border' 
                  : 'bg-primary/10 border-primary/30'
                }
              `}
            >
              <span className="text-2xl">{player.avatar}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {player.name}
                </div>
                {player.isBot && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    IQ {player.iq}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
      
      {/* Botão de iniciar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Button
          onClick={handleStartCountdown}
          disabled={!canAfford || isStarting}
          className="w-full h-14 text-lg font-bold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
        >
          <Play className="w-6 h-6 mr-2" />
          {canAfford 
            ? `Entrar no Torneio (-${entryFee} K$)` 
            : 'Créditos insuficientes'
          }
        </Button>
        
        {!canAfford && (
          <p className="text-center text-sm text-red-400 mt-2">
            Você precisa de {entryFee} K$ para participar
          </p>
        )}
      </motion.div>
    </div>
  );
}
