import { motion } from 'framer-motion';
import { useEffect, useState, useMemo } from 'react';

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
  const sparkles = useMemo(() => 
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: 15 + Math.random() * 70,
      top: 15 + Math.random() * 70,
      dur: 1.2 + Math.random() * 0.8,
      delay: Math.random() * 2,
      size: 1 + Math.random() * 2,
    })), [count]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {sparkles.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full"
          style={{
            width: s.size,
            height: s.size,
            background: `hsl(${color})`,
            left: `${s.left}%`,
            top: `${s.top}%`,
            boxShadow: `0 0 ${4 + s.size * 3}px ${s.size}px hsl(${color} / 0.6)`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.8, 0],
          }}
          transition={{
            duration: s.dur,
            repeat: Infinity,
            delay: s.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

export function HeartBubbles() {
  const hearts = useMemo(() => 
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      emoji: ['💕', '💗', '💖', '✨', '💫', '🌸', '💕', '💗'][i],
      left: 10 + Math.random() * 80,
      dur: 3 + Math.random() * 3,
      xDrift: (Math.random() - 0.5) * 60,
    })), []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {hearts.map((h) => (
        <motion.div
          key={h.id}
          className="absolute text-lg select-none"
          style={{ left: `${h.left}%`, bottom: '-5%' }}
          animate={{
            y: [0, -250, -500],
            x: [0, h.xDrift, h.xDrift * 0.5],
            opacity: [0, 0.9, 0],
            scale: [0.3, 1.3, 0.6],
            rotate: [0, h.xDrift > 0 ? 15 : -15, 0],
          }}
          transition={{
            duration: h.dur,
            repeat: Infinity,
            delay: h.id * 0.8,
            ease: 'easeOut',
          }}
        >
          {h.emoji}
        </motion.div>
      ))}
    </div>
  );
}

export function Fireflies({ count = 20 }: { count?: number }) {
  const flies = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      dur: 4 + Math.random() * 6,
      delay: Math.random() * 4,
      size: 2 + Math.random() * 3,
      color: Math.random() > 0.5 ? '45 90% 70%' : '160 50% 60%',
    })), [count]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {flies.map((f) => (
        <motion.div
          key={f.id}
          className="absolute rounded-full"
          style={{
            left: `${f.x}%`,
            top: `${f.y}%`,
            width: f.size,
            height: f.size,
            background: `hsl(${f.color})`,
            boxShadow: `0 0 ${f.size * 4}px ${f.size * 2}px hsl(${f.color} / 0.4)`,
          }}
          animate={{
            opacity: [0, 0.8, 0.3, 0.9, 0],
            x: [0, 30, -20, 15, -10],
            y: [0, -25, -10, -35, -50],
          }}
          transition={{
            duration: f.dur,
            repeat: Infinity,
            delay: f.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

export function VictoryFireworks({ color = '45 90% 55%' }: { color?: string }) {
  const bursts = useMemo(() =>
    Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * Math.PI * 2;
      return {
        id: i,
        targetX: Math.cos(angle) * (80 + Math.random() * 40),
        targetY: Math.sin(angle) * (80 + Math.random() * 40),
        size: 3 + Math.random() * 4,
        delay: Math.random() * 0.3,
      };
    }), []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
      {[0, 1, 2].map(wave => (
        <div key={wave} className="absolute">
          {bursts.map((b) => (
            <motion.div
              key={`${wave}-${b.id}`}
              className="absolute rounded-full"
              style={{
                width: b.size,
                height: b.size,
                background: `hsl(${color})`,
                boxShadow: `0 0 ${b.size * 3}px hsl(${color} / 0.8)`,
              }}
              animate={{
                x: [0, b.targetX],
                y: [0, b.targetY],
                opacity: [0, 1, 1, 0],
                scale: [0, 1.5, 1, 0],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: wave * 0.8 + b.delay,
                repeatDelay: 1.5,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
