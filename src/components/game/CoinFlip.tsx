import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getThemeById } from '@/lib/dinoThemes';
import { Sparkles } from './FloatingDinos';

interface CoinFlipProps {
  player0Name: string;
  player1Name: string;
  player0Theme: string;
  player1Theme: string;
  winnerIndex: number;
  onComplete: () => void;
}

export function CoinFlip({ player0Name, player1Name, player0Theme, player1Theme, winnerIndex, onComplete }: CoinFlipProps) {
  const [phase, setPhase] = useState<'flipping' | 'result'>('flipping');
  const theme0 = getThemeById(player0Theme);
  const theme1 = getThemeById(player1Theme);
  const winnerTheme = winnerIndex === 0 ? theme0 : theme1;
  const winnerName = winnerIndex === 0 ? player0Name : player1Name;

  useEffect(() => {
    const timer = setTimeout(() => setPhase('result'), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase === 'result') {
      const timer = setTimeout(onComplete, 2500);
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete]);

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center space-y-8 relative"
      >
        <Sparkles color="45 90% 60%" count={12} />
        
        <motion.h2
          className="text-3xl font-display text-foreground gold-glow"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Coin Flip!
        </motion.h2>
        <p className="text-sm text-muted-foreground">Who goes first?</p>

        {/* Enhanced coin */}
        <div className="relative w-32 h-32 mx-auto" style={{ perspective: 800 }}>
          <motion.div
            className="w-32 h-32 rounded-full border-4 flex items-center justify-center relative"
            style={{
              borderColor: `hsl(${winnerTheme.colors.primary})`,
              background: `linear-gradient(135deg, hsl(${winnerTheme.colors.cardBack}), hsl(${winnerTheme.colors.cardBackEnd}))`,
              boxShadow: phase === 'result'
                ? `0 0 30px hsl(${winnerTheme.colors.primary} / 0.5), 0 0 60px hsl(${winnerTheme.colors.primary} / 0.2)`
                : '0 8px 32px rgba(0,0,0,0.4)',
            }}
            animate={
              phase === 'flipping'
                ? { rotateX: [0, 360, 720, 1080, 1440], scale: [1, 1.15, 1, 1.15, 1], rotateZ: [0, 5, -5, 5, 0] }
                : { rotateX: 0, scale: [1.3, 1] }
            }
            transition={
              phase === 'flipping'
                ? { duration: 2, ease: 'easeInOut' }
                : { duration: 0.5, ease: 'easeOut' }
            }
          >
            <AnimatePresence mode="wait">
              {phase === 'flipping' ? (
                <motion.span
                  key="q"
                  className="text-4xl"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 0.3, repeat: Infinity }}
                >
                  🪙
                </motion.span>
              ) : (
                <motion.img
                  key="winner"
                  src={winnerTheme.image}
                  alt={winnerTheme.name}
                  className="w-16 h-16 object-contain drop-shadow-lg"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                />
              )}
            </AnimatePresence>
          </motion.div>
          
          {/* Glow ring */}
          {phase === 'result' && (
            <motion.div
              className="absolute inset-0 rounded-full -z-10"
              style={{ background: `radial-gradient(circle, hsl(${winnerTheme.colors.primary} / 0.3) 0%, transparent 70%)` }}
              initial={{ scale: 0 }}
              animate={{ scale: [1, 2, 1.5], opacity: [0.8, 0.3, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </div>

        {/* Dino matchup with VS animation */}
        <div className="flex items-center justify-center gap-6">
          <motion.div
            className="flex flex-col items-center gap-2"
            animate={phase === 'result' && winnerIndex === 0 ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <motion.img
              src={theme0.image}
              alt={theme0.name}
              className="w-12 h-12 object-contain drop-shadow-md"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-xs font-bold" style={{ color: `hsl(${theme0.colors.primary})` }}>{player0Name}</span>
          </motion.div>
          
          <motion.span
            className="text-2xl font-display text-muted-foreground"
            animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            ⚔️
          </motion.span>
          
          <motion.div
            className="flex flex-col items-center gap-2"
            animate={phase === 'result' && winnerIndex === 1 ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <motion.img
              src={theme1.image}
              alt={theme1.name}
              className="w-12 h-12 object-contain drop-shadow-md"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
            />
            <span className="text-xs font-bold" style={{ color: `hsl(${theme1.colors.primary})` }}>{player1Name}</span>
          </motion.div>
        </div>

        <AnimatePresence>
          {phase === 'result' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring' }}
              className="space-y-2"
            >
              <motion.p
                className="text-xl font-display gold-glow"
                style={{ color: `hsl(${winnerTheme.colors.primary})` }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                {winnerName} goes first! 🎉
              </motion.p>
              <p className="text-xs text-muted-foreground animate-pulse">Starting game...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
