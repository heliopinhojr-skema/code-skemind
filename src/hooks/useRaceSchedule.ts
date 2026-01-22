/**
 * useRaceSchedule - Controle de horários de corridas oficiais
 * 
 * Corridas oficiais:
 * - Disponíveis apenas entre 12h e 14h (horário local)
 * - Abrem a cada 5 minutos
 * - Mínimo/máximo de jogadores
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// ==================== TIPOS ====================

export interface ScheduledRace {
  id: string;
  name: string;
  startTime: Date;
  buyIn: number;
  fee: number;
  minPlayers: number;
  maxPlayers: number;
  currentPlayers: number;
  status: 'waiting' | 'starting' | 'running' | 'finished';
}

export interface BuyInOption {
  buyIn: number;
  fee: number;
  total: number;
  prize: string;
}

// ==================== CONSTANTES ====================

const RACE_START_HOUR = 12; // 12:00
const RACE_END_HOUR = 14;   // 14:00
const RACE_INTERVAL_MINUTES = 5;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 16;

export const BUY_IN_OPTIONS: BuyInOption[] = [
  { buyIn: 0.55, fee: 0.05, total: 0.60, prize: '5 K$' },
  { buyIn: 1.10, fee: 0.10, total: 1.20, prize: '10 K$' },
  { buyIn: 3.30, fee: 0.30, total: 3.60, prize: '30 K$' },
  { buyIn: 5.50, fee: 0.50, total: 6.00, prize: '50 K$' },
];

// ==================== HELPERS ====================

function isWithinRaceHours(): boolean {
  const now = new Date();
  const hour = now.getHours();
  return hour >= RACE_START_HOUR && hour < RACE_END_HOUR;
}

function getNextRaceTime(): Date {
  const now = new Date();
  const minutes = now.getMinutes();
  const nextInterval = Math.ceil((minutes + 1) / RACE_INTERVAL_MINUTES) * RACE_INTERVAL_MINUTES;
  
  const nextRace = new Date(now);
  nextRace.setMinutes(nextInterval);
  nextRace.setSeconds(0);
  nextRace.setMilliseconds(0);
  
  // Se passou do horário, vai para próximo slot
  if (nextRace <= now) {
    nextRace.setMinutes(nextRace.getMinutes() + RACE_INTERVAL_MINUTES);
  }
  
  return nextRace;
}

function getUpcomingRaces(): ScheduledRace[] {
  if (!isWithinRaceHours()) return [];
  
  const races: ScheduledRace[] = [];
  const now = new Date();
  let raceTime = getNextRaceTime();
  
  // Gera próximas 3 corridas
  for (let i = 0; i < 3; i++) {
    if (raceTime.getHours() >= RACE_END_HOUR) break;
    
    races.push({
      id: `race-${raceTime.getTime()}`,
      name: `Corrida #${raceTime.getHours()}${String(raceTime.getMinutes()).padStart(2, '0')}`,
      startTime: new Date(raceTime),
      buyIn: 1.10,
      fee: 0.10,
      minPlayers: MIN_PLAYERS,
      maxPlayers: MAX_PLAYERS,
      currentPlayers: Math.floor(Math.random() * 8) + 2, // Simulado
      status: 'waiting',
    });
    
    raceTime.setMinutes(raceTime.getMinutes() + RACE_INTERVAL_MINUTES);
  }
  
  return races;
}

function formatTimeUntil(target: Date): string {
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  
  if (diff <= 0) return '0:00';
  
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatTimeUntilRaceHours(): string {
  const now = new Date();
  const hour = now.getHours();
  
  if (hour >= RACE_END_HOUR) {
    // Próximo dia
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(RACE_START_HOUR, 0, 0, 0);
    const hoursUntil = Math.ceil((tomorrow.getTime() - now.getTime()) / 3600000);
    return `${hoursUntil}h`;
  }
  
  if (hour < RACE_START_HOUR) {
    const startTime = new Date(now);
    startTime.setHours(RACE_START_HOUR, 0, 0, 0);
    const hoursUntil = Math.ceil((startTime.getTime() - now.getTime()) / 3600000);
    return `${hoursUntil}h`;
  }
  
  return '0h';
}

// ==================== HOOK ====================

export function useRaceSchedule() {
  const [upcomingRaces, setUpcomingRaces] = useState<ScheduledRace[]>([]);
  const [isRaceTime, setIsRaceTime] = useState(false);
  const [nextRaceIn, setNextRaceIn] = useState('');
  const [raceHoursIn, setRaceHoursIn] = useState('');

  // Atualiza estado a cada segundo
  useEffect(() => {
    const update = () => {
      const raceTime = isWithinRaceHours();
      setIsRaceTime(raceTime);
      
      if (raceTime) {
        setUpcomingRaces(getUpcomingRaces());
        const next = getNextRaceTime();
        setNextRaceIn(formatTimeUntil(next));
      } else {
        setUpcomingRaces([]);
        setRaceHoursIn(formatTimeUntilRaceHours());
      }
    };
    
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Horário de corridas formatado
  const raceScheduleText = useMemo(() => {
    return `${RACE_START_HOUR}:00 - ${RACE_END_HOUR}:00`;
  }, []);

  return {
    isRaceTime,
    upcomingRaces,
    nextRaceIn,
    raceHoursIn,
    raceScheduleText,
    buyInOptions: BUY_IN_OPTIONS,
    constants: {
      startHour: RACE_START_HOUR,
      endHour: RACE_END_HOUR,
      intervalMinutes: RACE_INTERVAL_MINUTES,
      minPlayers: MIN_PLAYERS,
      maxPlayers: MAX_PLAYERS,
    },
  };
}
