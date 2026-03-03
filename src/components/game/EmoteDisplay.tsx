import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { playEmote } from '@/lib/sounds';
import emoteChoke from '@/assets/emote-choke.png';

type EmoteItem = { type: 'emoji'; value: string } | { type: 'image'; value: string; src: string };

const EMOTES: EmoteItem[] = [
  { type: 'emoji', value: '🦖' },
  { type: 'emoji', value: '🦕' },
  { type: 'emoji', value: '😂' },
  { type: 'emoji', value: '😤' },
  { type: 'emoji', value: '🔥' },
  { type: 'emoji', value: '💀' },
  { type: 'emoji', value: '👏' },
  { type: 'emoji', value: '😎' },
  { type: 'emoji', value: '🤔' },
  { type: 'emoji', value: '😱' },
  { type: 'emoji', value: '🫣' },
  { type: 'emoji', value: '🤢' },
  { type: 'emoji', value: '🤦‍♀️' },
  { type: 'emoji', value: '💕' },
  { type: 'image', value: 'img:choke', src: emoteChoke },
];

export function isImageEmote(emote: string): boolean {
  return emote.startsWith('img:');
}

export function getImageEmoteSrc(emote: string): string | undefined {
  const item = EMOTES.find(e => e.type === 'image' && e.value === emote);
  return item?.type === 'image' ? item.src : undefined;
}

interface EmoteDisplayProps {
  onSendEmote: (emote: string) => void;
  activeEmote: { emote: string; from: number } | null;
  playerIndex: number;
}

export function EmotePicker({ onSendEmote }: { onSendEmote: (emote: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="ghost"
        className="h-8 px-2 text-lg"
        onClick={() => setOpen(!open)}
      >
        😀
      </Button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            className="absolute bottom-full mb-2 left-0 glass-panel rounded-xl p-2 grid grid-cols-5 gap-1.5 w-[240px] z-50"
          >
            {EMOTES.map((emote) => (
              <motion.button
                key={emote.value}
                whileHover={{ scale: 1.3, y: -2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  playEmote();
                  onSendEmote(emote.value);
                  setOpen(false);
                }}
                className="text-xl p-1.5 rounded-lg hover:bg-secondary/60 flex items-center justify-center transition-colors"
              >
                {emote.type === 'emoji' ? (
                  emote.value
                ) : (
                  <img src={emote.src} alt="emote" className="w-7 h-7 object-contain" />
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function EmoteBubble({ emote, isOpponent }: { emote: string; isOpponent: boolean }) {
  const imgSrc = isImageEmote(emote) ? getImageEmoteSrc(emote) : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0, y: -30 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={`fixed z-50 ${isOpponent ? 'top-24 right-8' : 'bottom-48 right-8'}`}
    >
      <motion.div
        className="relative"
        animate={{ scale: [1, 1.4, 1] }}
        transition={{ duration: 0.6, repeat: 2 }}
      >
        {/* Glow behind emote */}
        <motion.div
          className="absolute inset-0 rounded-full blur-xl -z-10"
          style={{ background: 'hsl(var(--primary) / 0.3)' }}
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
        {imgSrc ? (
          <img src={imgSrc} alt="emote" className="w-14 h-14 object-contain drop-shadow-lg" />
        ) : (
          <span className="text-5xl drop-shadow-lg">{emote}</span>
        )}
      </motion.div>
    </motion.div>
  );
}
