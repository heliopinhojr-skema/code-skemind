/**
 * OnlinePlayersPanel - Mostra jogadores online no lobby
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Users, Circle, Gamepad2 } from 'lucide-react';
import { OnlinePlayer } from '@/hooks/useOnlinePlayers';
import { getColorConfig, PlanetFace, PlanetMood } from './GenerationColorPicker';

interface OnlinePlayersPanelProps {
  players: OnlinePlayer[];
  currentPlayerId?: string;
  isConnected: boolean;
}

export function OnlinePlayersPanel({ players, currentPlayerId, isConnected }: OnlinePlayersPanelProps) {
  // Filter out current player and limit display
  const otherPlayers = players.filter(p => p.id !== currentPlayerId);
  const displayPlayers = otherPlayers.slice(0, 10);
  const extraCount = Math.max(0, otherPlayers.length - 10);

  const getStatusIcon = (status: OnlinePlayer['status']) => {
    switch (status) {
      case 'playing':
        return <Gamepad2 className="w-3 h-3 text-yellow-400" />;
      case 'away':
        return <Circle className="w-2 h-2 fill-gray-400 text-gray-400" />;
      default:
        return <Circle className="w-2 h-2 fill-green-400 text-green-400" />;
    }
  };

  const getStatusColor = (status: OnlinePlayer['status']) => {
    switch (status) {
      case 'playing':
        return 'border-yellow-500/50 bg-yellow-500/10';
      case 'away':
        return 'border-gray-500/50 bg-gray-500/10';
      default:
        return 'border-green-500/50 bg-green-500/10';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-white">Jogadores Online</span>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-green-400"
            />
          ) : (
            <div className="w-2 h-2 rounded-full bg-gray-500" />
          )}
          <span className="text-xs text-white/60">
            {otherPlayers.length} online
          </span>
        </div>
      </div>

      {/* Players list */}
      {displayPlayers.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-white/40">
            Você é o único online agora
          </p>
          <p className="text-xs text-white/30 mt-1">
            Convide amigos para jogar!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {displayPlayers.map((player) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                layout
                className={`flex items-center gap-3 p-2 rounded-lg border ${getStatusColor(player.status)}`}
              >
                {/* Avatar with mood */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/50 to-purple-500/50 flex items-center justify-center text-lg">
                  <PlanetFace variant={(player.mood as PlanetMood) || 'happy'} size="w-6 h-6" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">
                      {player.name}
                    </span>
                    {getStatusIcon(player.status)}
                  </div>
                  <span className="text-xs text-white/40">
                    {player.status === 'playing' ? 'Jogando' : 
                     player.status === 'away' ? 'Ausente' : 'No lobby'}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Extra count */}
          {extraCount > 0 && (
            <div className="text-center py-2">
              <span className="text-xs text-white/40">
                +{extraCount} mais online
              </span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
