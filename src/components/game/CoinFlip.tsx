import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getThemeById } from '@/lib/dinoThemes';

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
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete]);

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="text-center space-y-6">
        <h2 className="text-2xl font-display text-foreground">Coin Flip!</h2>
        <p className="text-sm text-muted-foreground">Who goes first?</p>

        {/* Coin */}
        <div className="relative w-28 h-28 mx-auto" style={{ perspective: 600 }}>
          <motion.div
            className="w-28 h-28 rounded-full border-4 flex items-center justify-center shadow-xl"
            style={{
              borderColor: `hsl(${winnerTheme.colors.primary})`,
              background: `linear-gradient(135deg, hsl(${winnerTheme.colors.cardBack}), hsl(${winnerTheme.colors.cardBackEnd}))`,
            }}
            animate={
              phase === 'flipping'
                ? { rotateX: [0, 360, 720, 1080, 1440], scale: [1, 1.1, 1, 1.1, 1] }
                : { rotateX: 0, scale: [1.2, 1] }
            }
            transition={
              phase === 'flipping'
                ? { duration: 2, ease: 'easeInOut' }
                : { duration: 0.4, ease: 'easeOut' }
            }
          >
            <AnimatePresence mode="wait">
              {phase === 'flipping' ? (
                <motion.span
                  key="q"
                  className="text-3xl"
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
                  className="w-14 h-14 object-contain"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                />
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Dino matchup */}
        <div className="flex items-center justify-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <img src={theme0.image} alt={theme0.name} className="w-10 h-10 object-contain" />
            <span className="text-xs font-semibold" style={{ color: `hsl(${theme0.colors.primary})` }}>{player0Name}</span>
          </div>
          <span className="text-muted-foreground font-bold">VS</span>
          <div className="flex flex-col items-center gap-1">
            <img src={theme1.image} alt={theme1.name} className="w-10 h-10 object-contain" />
            <span className="text-xs font-semibold" style={{ color: `hsl(${theme1.colors.primary})` }}>{player1Name}</span>
          </div>
        </div>

        <AnimatePresence>
          {phase === 'result' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-1"
            >
              <p className="text-lg font-display" style={{ color: `hsl(${winnerTheme.colors.primary})` }}>
                {winnerName} goes first!
              </p>
              <p className="text-xs text-muted-foreground">Starting game...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
