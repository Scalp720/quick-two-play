import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music } from 'lucide-react';

const PLAYLIST_ID = '37i9dQZF1DWYmDNATKqPDd'; // Bad Bunny essentials

export function SpotifyPlayer() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="mb-3 rounded-2xl overflow-hidden shadow-2xl"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}
          >
            <iframe
              src={`https://open.spotify.com/embed/playlist/${PLAYLIST_ID}?utm_source=generator&theme=0`}
              width="320"
              height="380"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-2xl"
              title="Bad Bunny Playlist"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(!open)}
        className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg backdrop-blur-md border border-border/40"
        style={{
          background: open
            ? 'linear-gradient(135deg, #1DB954, #1ed760)'
            : 'hsl(var(--secondary) / 0.8)',
        }}
      >
        <Music className="w-5 h-5" style={{ color: open ? '#fff' : 'hsl(var(--foreground))' }} />
      </motion.button>
    </div>
  );
}
