/**
 * SplashScreen - Tela de entrada épica do SKEMA Universe
 * 
 * Exibe imagem cósmica + frase filosófica antes de ir ao lobby/auth.
 * Auto-avança após 4 segundos ou ao toque/click.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import skemaSplash from '@/assets/skema-splash.jpeg';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 600); // wait for exit animation
    }, 4000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    setVisible(false);
    setTimeout(onComplete, 600);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          onClick={handleSkip}
          className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center cursor-pointer select-none overflow-hidden"
        >
          {/* Background image with zoom animation */}
          <motion.div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${skemaSplash})` }}
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.7 }}
            transition={{ duration: 3, ease: 'easeOut' }}
          />
          
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black" />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center px-8">
            {/* SKEMA title */}
            <motion.h1
              initial={{ opacity: 0, y: -30, letterSpacing: '0.5em' }}
              animate={{ opacity: 1, y: 0, letterSpacing: '0.3em' }}
              transition={{ delay: 0.5, duration: 1.2, ease: 'easeOut' }}
              className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-purple-200 to-purple-400 drop-shadow-2xl"
            >
              skema
            </motion.h1>

            {/* Divider line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 1.2, duration: 0.8, ease: 'easeInOut' }}
              className="w-48 h-px bg-gradient-to-r from-transparent via-purple-400 to-transparent mt-4 mb-6"
            />

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.8, duration: 1 }}
              className="text-sm md:text-base tracking-[0.15em] uppercase text-purple-200/80 font-light max-w-sm"
            >
              Cada escolha uma renúncia,
              <br />
              uma consequência...
            </motion.p>

            {/* Tap to continue */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0] }}
              transition={{ delay: 3, duration: 2, repeat: Infinity }}
              className="mt-12 text-xs text-white/40 tracking-widest uppercase"
            >
              Toque para continuar
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
