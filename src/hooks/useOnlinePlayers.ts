/**
 * useOnlinePlayers - Hook para presença em tempo real via Supabase
 * 
 * Rastreia jogadores online no lobby usando Supabase Realtime Presence
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type PlayerMood = 'happy' | 'sleeping' | 'sad' | 'angry';

export interface OnlinePlayer {
  id: string;
  name: string;
  emoji: string;
  status: 'online' | 'playing' | 'away';
  mood: PlayerMood;
  joinedAt: string;
}

interface PresenceState {
  [key: string]: OnlinePlayer[];
}

export function useOnlinePlayers(currentPlayer: { id: string; name: string; emoji: string } | null) {
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentMood, setCurrentMood] = useState<PlayerMood>('happy');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const moodRef = useRef<PlayerMood>(currentMood);

  // Track current player's presence
  const trackPresence = useCallback(async (status: 'online' | 'playing' | 'away' = 'online', mood?: PlayerMood) => {
    if (!channelRef.current || !currentPlayer) return;
    const m = mood ?? moodRef.current;

    try {
      await channelRef.current.track({
        id: currentPlayer.id,
        name: currentPlayer.name,
        emoji: currentPlayer.emoji,
        status,
        mood: m,
        joinedAt: new Date().toISOString(),
      });
      console.log('[PRESENCE] Tracked status:', status, 'mood:', m);
    } catch (e) {
      console.error('[PRESENCE] Failed to track:', e);
    }
  }, [currentPlayer]);

  // Update status (e.g., when entering a game)
  const updateStatus = useCallback((status: 'online' | 'playing' | 'away') => {
    trackPresence(status);
  }, [trackPresence]);

  const updateMood = useCallback((mood: PlayerMood) => {
    moodRef.current = mood;
    setCurrentMood(mood);
    trackPresence(undefined, mood);
  }, [trackPresence]);

  useEffect(() => {
    if (!currentPlayer) {
      setOnlinePlayers([]);
      setIsConnected(false);
      return;
    }

    console.log('[PRESENCE] Setting up channel for:', currentPlayer.name);

    // Create presence channel
    const channel = supabase.channel('skema-lobby', {
      config: {
        presence: {
          key: currentPlayer.id,
        },
      },
    });

    channelRef.current = channel;

    // Handle presence sync
    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState() as PresenceState;
      console.log('[PRESENCE] Sync:', presenceState);

      // Flatten presence state to array of unique players
      const players: OnlinePlayer[] = [];
      const seenIds = new Set<string>();

      Object.values(presenceState).forEach((presences) => {
        presences.forEach((presence) => {
          if (!seenIds.has(presence.id)) {
            seenIds.add(presence.id);
            players.push(presence);
          }
        });
      });

      // Sort by join time
      players.sort((a, b) => 
        new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
      );

      setOnlinePlayers(players);
    });

    // Handle join events - show notification
    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('[PRESENCE] Player joined:', key, newPresences);
      
      // Show toast for each new player (except self)
      newPresences.forEach((presence) => {
        const player = presence as unknown as OnlinePlayer;
        if (player.id !== currentPlayer.id) {
          toast(`${player.emoji} ${player.name} entrou no lobby`, {
            duration: 3000,
            position: 'top-right',
          });
        }
      });
    });

    // Handle leave events - show notification
    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('[PRESENCE] Player left:', key, leftPresences);
      
      // Show toast for each player that left (except self)
      leftPresences.forEach((presence) => {
        const player = presence as unknown as OnlinePlayer;
        if (player.id !== currentPlayer.id) {
          toast(`${player.emoji} ${player.name} saiu do lobby`, {
            duration: 2000,
            position: 'top-right',
          });
        }
      });
    });

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        console.log('[PRESENCE] Subscribed to channel');
        
        // Track our presence
        await channel.track({
          id: currentPlayer.id,
          name: currentPlayer.name,
          emoji: currentPlayer.emoji,
          status: 'online',
          mood: moodRef.current,
          joinedAt: new Date().toISOString(),
        });
      }
    });

    // Cleanup
    return () => {
      console.log('[PRESENCE] Cleaning up channel');
      channel.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [currentPlayer?.id, currentPlayer?.name, currentPlayer?.emoji]);

  // Handle visibility change (away when tab is hidden)
  useEffect(() => {
    if (!currentPlayer) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        trackPresence('away');
      } else {
        trackPresence('online');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentPlayer, trackPresence]);

  return {
    onlinePlayers,
    isConnected,
    updateStatus,
    updateMood,
    currentMood,
    onlineCount: onlinePlayers.filter(p => p.id !== currentPlayer?.id).length,
  };
}
