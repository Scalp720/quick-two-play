import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

const EMOTES = ['🦖', '🦕', '😂', '😤', '🔥', '💀', '👏', '😎', '🤔', '😱'];

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
            className="absolute bottom-full mb-2 left-0 bg-card border border-border rounded-xl p-2 grid grid-cols-4 gap-2 w-[200px] z-50 shadow-lg"
          >
            {EMOTES.map((emote) => (
              <button
                key={emote}
                onClick={() => {
                  onSendEmote(emote);
                  setOpen(false);
                }}
                className="text-xl hover:scale-125 transition-transform p-1 rounded hover:bg-secondary"
              >
                {emote}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function EmoteBubble({ emote, isOpponent }: { emote: string; isOpponent: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={`fixed z-50 text-4xl ${isOpponent ? 'top-24 right-8' : 'bottom-48 right-8'}`}
    >
      <motion.span
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 0.5, repeat: 1 }}
      >
        {emote}
      </motion.span>
    </motion.div>
  );
}
