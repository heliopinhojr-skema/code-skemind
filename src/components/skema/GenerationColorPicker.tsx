/**
 * GenerationColorPicker - Seletor de cor de geração para Criadores
 * Cada Criador escolhe uma das 10 cores, que se propaga a toda descendência.
 * Cores já escolhidas ficam travadas.
 */

import { useState, forwardRef } from 'react';
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

// Planet face SVG — two rich variants matching cosmic orb aesthetic
// variant="closed" = serene dreaming face with rosy cheeks
// variant="open" = cute big sparkly eyes with lashes and blush
export const PlanetFace = forwardRef<SVGSVGElement, { className?: string; variant?: 'closed' | 'open'; size?: string }>(function PlanetFace({ className, variant = 'closed', size }, _ref) {
  const sizeClass = size || 'w-8 h-8';

  if (variant === 'open') {
    return (
      <svg viewBox="0 0 80 80" className={`${sizeClass} ${className || ''}`}>
        <defs>
          <radialGradient id="pf-cheek-l" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="pf-cheek-r" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="pf-eye-shine" cx="0.3" cy="0.3" r="0.5">
            <stop offset="0%" stopColor="white" stopOpacity="0.95" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Left eye — large glossy */}
        <ellipse cx="28" cy="32" rx="9" ry="9.5" fill="white" opacity="0.97" />
        <ellipse cx="28" cy="32" rx="8" ry="8.5" fill="white" />
        <circle cx="29.5" cy="33" r="5.5" fill="#1a2d4a" />
        <circle cx="29.5" cy="33" r="3.2" fill="#0d1520" />
        <circle cx="31" cy="30.5" r="2" fill="url(#pf-eye-shine)" />
        <circle cx="27" cy="35" r="1" fill="white" opacity="0.5" />
        {/* Left lashes */}
        <path d="M19 26 Q22 22 25 24" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.6" />
        <path d="M22 24 Q25 20 28 23" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.4" />
        {/* Right eye — large glossy */}
        <ellipse cx="52" cy="32" rx="9" ry="9.5" fill="white" opacity="0.97" />
        <ellipse cx="52" cy="32" rx="8" ry="8.5" fill="white" />
        <circle cx="53.5" cy="33" r="5.5" fill="#1a2d4a" />
        <circle cx="53.5" cy="33" r="3.2" fill="#0d1520" />
        <circle cx="55" cy="30.5" r="2" fill="url(#pf-eye-shine)" />
        <circle cx="51" cy="35" r="1" fill="white" opacity="0.5" />
        {/* Right lashes */}
        <path d="M55 24 Q58 20 61 24" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.4" />
        <path d="M58 26 Q55 22 52 24" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.6" />
        {/* Blush / rosy cheeks */}
        <ellipse cx="18" cy="42" rx="6" ry="4" fill="url(#pf-cheek-l)" />
        <ellipse cx="62" cy="42" rx="6" ry="4" fill="url(#pf-cheek-r)" />
        {/* Mouth — cute open smile with tongue hint */}
        <path d="M32 50 Q40 60 48 50" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M36 52 Q40 56 44 52" fill="currentColor" opacity="0.15" />
        {/* Sparkle accents */}
        <g opacity="0.6" fill="currentColor">
          <polygon points="14,18 15,15 16,18 15,19" />
          <polygon points="65,16 66,13 67,16 66,17" />
        </g>
      </svg>
    );
  }

  // Closed eyes (default) - serene dreaming orb with rosy cheeks
  return (
    <svg viewBox="0 0 80 80" className={`${sizeClass} ${className || ''}`} fill="currentColor">
      <defs>
        <radialGradient id="pf-blush-l" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pf-blush-r" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Left eye — elegant thick arc with lash tips */}
      <path d="M18 33 Q24 23 32 33" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M18 33 Q16 30 18 28" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.5" />
      <path d="M32 33 Q34 30 32 28" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.5" />
      {/* Right eye — elegant thick arc with lash tips */}
      <path d="M48 33 Q54 23 62 33" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M48 33 Q46 30 48 28" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.5" />
      <path d="M62 33 Q64 30 62 28" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.5" />
      {/* Blush / rosy cheeks */}
      <ellipse cx="18" cy="42" rx="6" ry="3.5" fill="url(#pf-blush-l)" />
      <ellipse cx="62" cy="42" rx="6" ry="3.5" fill="url(#pf-blush-r)" />
      {/* Serene smile — soft double curve */}
      <path d="M30 50 Q40 60 50 50" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* Tiny stars / sparkles near face */}
      <g opacity="0.5" fill="currentColor">
        <circle cx="12" cy="20" r="1.2" />
        <circle cx="68" cy="22" r="1" />
        <circle cx="40" cy="14" r="0.8" />
      </g>
    </svg>
  );
});

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
