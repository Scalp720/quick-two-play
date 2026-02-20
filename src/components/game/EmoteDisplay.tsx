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
            className="absolute bottom-full mb-2 left-0 bg-card border border-border rounded-xl p-2 grid grid-cols-4 gap-2 w-[210px] z-50 shadow-lg"
          >
            {EMOTES.map((emote) => (
              <button
                key={emote.value}
                onClick={() => {
                  playEmote();
                  onSendEmote(emote.value);
                  setOpen(false);
                }}
                className="text-xl hover:scale-125 transition-transform p-1 rounded hover:bg-secondary flex items-center justify-center"
              >
                {emote.type === 'emoji' ? (
                  emote.value
                ) : (
                  <img src={emote.src} alt="emote" className="w-7 h-7 object-contain" />
                )}
              </button>
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
      exit={{ opacity: 0, scale: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={`fixed z-50 ${isOpponent ? 'top-24 right-8' : 'bottom-48 right-8'}`}
    >
      <motion.span
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 0.5, repeat: 1 }}
        className="block"
      >
        {imgSrc ? (
          <img src={imgSrc} alt="emote" className="w-12 h-12 object-contain" />
        ) : (
          <span className="text-4xl">{emote}</span>
        )}
      </motion.span>
    </motion.div>
  );
}
