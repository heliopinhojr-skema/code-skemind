/**
 * RNG AMBIENTAL SKEMIND v1 - Hook React
 * 
 * "O ambiente muda. A regra permanece."
 * 
 * Este hook gerencia o estado ambiental por rodada.
 * A configuração é gerada UMA VEZ e TRAVADA para toda a rodada.
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  generateEnvironmentalConfig, 
  type EnvironmentalConfig 
} from '@/lib/seededRng';

interface UseEnvironmentalRngProps {
  roundId: string;
  symbolCount?: number;
}

interface UseEnvironmentalRngReturn {
  config: EnvironmentalConfig;
  isLocked: boolean;
}

/**
 * Hook para RNG Ambiental
 * 
 * GARANTIAS:
 * 1. Mesmo roundId = mesmo ambiente (determinístico)
 * 2. Configuração travada após geração
 * 3. Não interfere na lógica do jogo
 * 4. Novo roundId = novo ambiente
 */
export function useEnvironmentalRng({ 
  roundId, 
  symbolCount = 6 
}: UseEnvironmentalRngProps): UseEnvironmentalRngReturn {
  
  // Gera config apenas quando roundId muda
  const config = useMemo(() => {
    return generateEnvironmentalConfig(roundId, symbolCount);
  }, [roundId, symbolCount]);
  
  // Estado de travamento
  const [isLocked, setIsLocked] = useState(false);
  
  // Travar após primeira renderização
  useEffect(() => {
    setIsLocked(true);
  }, [roundId]);
  
  // Log para debug (apenas em dev)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('═══ RNG AMBIENTAL SKEMIND v1 ═══');
      console.log(`Round: ${roundId}`);
      console.log(`Seed: ${config.seed}`);
      console.log(`Pattern: ${config.backgroundPattern}`);
      console.log(`Picker Order: [${config.symbolPickerOrder.join(', ')}]`);
      console.log(`Rotation: ${config.gridRotation.toFixed(2)}°`);
      console.log(`Spacing: ${config.spacingMultiplier.toFixed(3)}x`);
      console.log(`Locked: ${isLocked}`);
      console.log('═════════════════════════════════');
    }
  }, [config, roundId, isLocked]);
  
  return { config, isLocked };
}
