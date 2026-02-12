/**
 * GenerationColorPicker - Seletor de cor de geração para Criadores
 * Cada Criador escolhe uma das 10 cores, que se propaga a toda descendência.
 * Cores já escolhidas ficam travadas.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Lock, Sparkles } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface GenerationColorPickerProps {
  playerId: string;
  onColorChosen: (color: string) => void;
}

// 10 cores de geração — cada uma com glow e gradiente inspirados nos planetas da referência
export const GENERATION_COLORS: { id: string; name: string; glow: string; bg: string; border: string; face: string }[] = [
  { id: 'blue',    name: 'Azul Celeste',   glow: 'shadow-[0_0_30px_rgba(59,130,246,0.7)]',  bg: 'bg-gradient-to-br from-blue-400 to-blue-600',    border: 'border-blue-400/60',    face: 'text-blue-900' },
  { id: 'pink',    name: 'Rosa Cósmico',    glow: 'shadow-[0_0_30px_rgba(236,72,153,0.7)]',  bg: 'bg-gradient-to-br from-pink-400 to-pink-600',    border: 'border-pink-400/60',    face: 'text-pink-900' },
  { id: 'yellow',  name: 'Amarelo Solar',   glow: 'shadow-[0_0_30px_rgba(234,179,8,0.7)]',   bg: 'bg-gradient-to-br from-yellow-400 to-yellow-600', border: 'border-yellow-400/60',  face: 'text-yellow-900' },
  { id: 'green',   name: 'Verde Nebulosa',  glow: 'shadow-[0_0_30px_rgba(34,197,94,0.7)]',   bg: 'bg-gradient-to-br from-green-400 to-green-600',   border: 'border-green-400/60',   face: 'text-green-900' },
  { id: 'red',     name: 'Vermelho Estelar',glow: 'shadow-[0_0_30px_rgba(239,68,68,0.7)]',   bg: 'bg-gradient-to-br from-red-400 to-red-600',       border: 'border-red-400/60',     face: 'text-red-900' },
  { id: 'purple',  name: 'Púrpura Galáxia', glow: 'shadow-[0_0_30px_rgba(168,85,247,0.7)]',  bg: 'bg-gradient-to-br from-purple-400 to-purple-600', border: 'border-purple-400/60',  face: 'text-purple-900' },
  { id: 'orange',  name: 'Laranja Supernova',glow: 'shadow-[0_0_30px_rgba(249,115,22,0.7)]', bg: 'bg-gradient-to-br from-orange-400 to-orange-600', border: 'border-orange-400/60',  face: 'text-orange-900' },
  { id: 'cyan',    name: 'Ciano Orbital',   glow: 'shadow-[0_0_30px_rgba(6,182,212,0.7)]',   bg: 'bg-gradient-to-br from-cyan-400 to-cyan-600',     border: 'border-cyan-400/60',    face: 'text-cyan-900' },
  { id: 'white',   name: 'Branco Lunar',    glow: 'shadow-[0_0_30px_rgba(255,255,255,0.5)]', bg: 'bg-gradient-to-br from-gray-200 to-gray-400',     border: 'border-white/60',       face: 'text-gray-700' },
  { id: 'crimson', name: 'Carmesim Profundo',glow: 'shadow-[0_0_30px_rgba(220,38,38,0.7)]',  bg: 'bg-gradient-to-br from-rose-500 to-red-700',      border: 'border-rose-400/60',    face: 'text-rose-900' },
];

export function getColorConfig(colorId: string | null) {
  return GENERATION_COLORS.find(c => c.id === colorId) || null;
}

// Planet face SVG — two variants matching the cosmic orb reference
// variant="closed" = serene closed eyes (left orb in reference)
// variant="open" = cute big eyes (right orb in reference)
export function PlanetFace({ className, variant = 'closed', size }: { className?: string; variant?: 'closed' | 'open'; size?: string }) {
  const sizeClass = size || 'w-8 h-8';

  if (variant === 'open') {
    return (
      <svg viewBox="0 0 60 60" className={`${sizeClass} ${className || ''}`}>
        {/* Left eye - big round with iris & pupil & shine */}
        <circle cx="20" cy="24" r="6.5" fill="white" opacity="0.95" />
        <circle cx="21" cy="24.5" r="4" fill="#1a3a5c" />
        <circle cx="21" cy="24.5" r="2.2" fill="#0a1a2e" />
        <circle cx="22.5" cy="23" r="1.2" fill="white" opacity="0.9" />
        {/* Right eye */}
        <circle cx="40" cy="24" r="6.5" fill="white" opacity="0.95" />
        <circle cx="41" cy="24.5" r="4" fill="#1a3a5c" />
        <circle cx="41" cy="24.5" r="2.2" fill="#0a1a2e" />
        <circle cx="42.5" cy="23" r="1.2" fill="white" opacity="0.9" />
        {/* Eyebrows */}
        <path d="M13 17 Q17 14 23 16" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.5" />
        <path d="M37 16 Q43 14 47 17" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.5" />
        {/* Smile - open happy */}
        <path d="M22 37 Q30 44 38 37" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </svg>
    );
  }

  // Closed eyes (default) - serene meditation face
  return (
    <svg viewBox="0 0 60 60" className={`${sizeClass} ${className || ''}`} fill="currentColor">
      {/* Left eye - closed arc, thicker */}
      <path d="M14 25 Q20 19 26 25" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Right eye - closed arc */}
      <path d="M34 25 Q40 19 46 25" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Serene smile */}
      <path d="M21 36 Q30 43 39 36" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function GenerationColorPicker({ playerId, onColorChosen }: GenerationColorPickerProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch taken colors
  const { data: takenColors, isLoading } = useQuery({
    queryKey: ['taken-generation-colors'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('generation_color')
        .not('generation_color', 'is', null)
        .in('player_tier', ['Criador', 'guardiao']);
      return (data || []).map(p => (p as any).generation_color as string).filter(Boolean);
    },
    staleTime: 10_000,
  });

  const chooseMutation = useMutation({
    mutationFn: async (colorId: string) => {
      const { error } = await supabase.rpc('choose_generation_color', {
        p_player_id: playerId,
        p_color: colorId,
      } as any);

      if (error) throw new Error(error.message);
      return colorId;
    },
    onSuccess: (colorId) => {
      queryClient.invalidateQueries({ queryKey: ['taken-generation-colors'] });
      toast.success('Cor de geração escolhida! Toda sua linhagem agora carrega essa cor.');
      onColorChosen(colorId);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao escolher cor');
    },
  });

  const taken = takenColors || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-purple-500/15 via-black/40 to-indigo-500/15 border border-purple-500/30 rounded-xl p-4 backdrop-blur-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <h3 className="text-sm font-bold text-white">Escolha a Cor da sua Geração</h3>
      </div>
      <p className="text-[10px] text-white/50 mb-4">
        Sua cor será herdada por toda a sua descendência — de Grão Mestres até Plofts. Uma vez escolhida, não pode ser alterada.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-3 mb-4">
            {GENERATION_COLORS.map((color) => {
              const isTaken = taken.includes(color.id);
              const isSelected = selected === color.id;

              return (
                <motion.button
                  key={color.id}
                  whileHover={!isTaken ? { scale: 1.1 } : undefined}
                  whileTap={!isTaken ? { scale: 0.95 } : undefined}
                  onClick={() => !isTaken && setSelected(color.id)}
                  disabled={isTaken}
                  className={`relative flex flex-col items-center gap-1 p-1 rounded-xl transition-all ${
                    isTaken
                      ? 'opacity-30 cursor-not-allowed'
                      : isSelected
                        ? `ring-2 ring-white ring-offset-2 ring-offset-black/80 ${color.glow}`
                        : 'hover:opacity-90'
                  }`}
                >
                  {/* Planet */}
                  <div className={`w-12 h-12 rounded-full ${color.bg} ${!isTaken ? color.glow : ''} flex items-center justify-center relative`}>
                    <PlanetFace className={color.face} />
                    {isTaken && (
                      <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                        <Lock className="w-4 h-4 text-white/60" />
                      </div>
                    )}
                  </div>
                  <span className="text-[8px] text-white/60 text-center leading-tight">{color.name}</span>
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Button
                  onClick={() => chooseMutation.mutate(selected)}
                  disabled={chooseMutation.isPending}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500"
                >
                  {chooseMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Confirmar: {GENERATION_COLORS.find(c => c.id === selected)?.name}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}
