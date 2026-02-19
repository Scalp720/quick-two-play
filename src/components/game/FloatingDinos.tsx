import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const DINO_EMOJIS = ['🦖', '🦕', '🌋', '🌿', '🥚', '🦴', '☄️', '🍃'];

interface Particle {
  id: number;
  emoji: string;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

export function FloatingDinos({ count = 12 }: { count?: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const p: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      emoji: DINO_EMOJIS[Math.floor(Math.random() * DINO_EMOJIS.length)],
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 14 + Math.random() * 18,
      duration: 6 + Math.random() * 10,
      delay: Math.random() * 5,
    }));
    setParticles(p);
  }, [count]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute select-none"
          style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: p.size }}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 0.4, 0.2, 0.4, 0],
            y: [0, -30, -15, -40, -60],
            x: [0, 10, -10, 5, 0],
            rotate: [0, 10, -10, 5, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        >
          {p.emoji}
        </motion.div>
      ))}
    </div>
  );
}

export function Sparkles({ color = '45 90% 55%', count = 6 }: { color?: string; count?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            background: `hsl(${color})`,
            left: `${15 + Math.random() * 70}%`,
            top: `${15 + Math.random() * 70}%`,
            boxShadow: `0 0 6px 2px hsl(${color} / 0.5)`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 1.2 + Math.random() * 0.8,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

export function HeartBubbles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-lg select-none"
          style={{
            left: `${20 + Math.random() * 60}%`,
            bottom: '0%',
          }}
          animate={{
            y: [0, -200, -400],
            x: [0, Math.random() > 0.5 ? 20 : -20, 0],
            opacity: [0, 0.8, 0],
            scale: [0.5, 1.2, 0.8],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: i * 1.5,
            ease: 'easeOut',
          }}
        >
          💕
        </motion.div>
      ))}
    </div>
  );
}
