/**
 * CosmicBackground - Persistent universe background
 * 
 * Used across all screens: lobby, gameplay, victory, defeat, tournament results
 * Must always remain visible behind UI cards.
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import universeBg from '@/assets/universe-bg.jpg';

interface CosmicBackgroundProps {
  starCount?: number;
}

export function CosmicBackground({ starCount = 50 }: CosmicBackgroundProps) {
  const stars = useMemo(() => 
    Array.from({ length: starCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 3,
    })), [starCount]
  );

  return (
    <>
      {/* Universe background image */}
      <div 
        className="fixed inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: `url(${universeBg})` }}
      />
      
      {/* Dark overlay for readability */}
      <div className="fixed inset-0 bg-black/60 z-0" />
      
      {/* Animated stars */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {stars.map(star => (
          <motion.div
            key={star.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
            }}
            animate={{
              opacity: [0.2, 1, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: star.delay,
            }}
          />
        ))}
      </div>
    </>
  );
}
