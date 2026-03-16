import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX } from 'lucide-react';

const TRACKS = [
  { title: 'DtMF', src: '/music/DtMF.mp3' },
  { title: 'EoO', src: '/music/EoO.mp3' },
  { title: 'Tití Me Preguntó', src: '/music/Titi_Me_Pregunto.mp3' },
];

export function SpotifyPlayer() {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(TRACKS[0].src);
    audio.preload = 'auto';
    audioRef.current = audio;

    audio.addEventListener('timeupdate', () => {
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
    });

    audio.addEventListener('ended', () => {
      // Auto-advance to next track
      setCurrent(prev => {
        const next = (prev + 1) % TRACKS.length;
        audio.src = TRACKS[next].src;
        audio.play();
        return next;
      });
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  }, [playing]);

  const changeTrack = useCallback((dir: 1 | -1) => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrent(prev => {
      const next = (prev + dir + TRACKS.length) % TRACKS.length;
      audio.src = TRACKS[next].src;
      if (playing) audio.play();
      setProgress(0);
      return next;
    });
  }, [playing]);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !muted;
    setMuted(!muted);
  }, [muted]);

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * audio.duration;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="mb-3 rounded-2xl overflow-hidden shadow-2xl w-72 backdrop-blur-xl border border-border/40"
            style={{
              background: 'hsl(var(--card) / 0.9)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
            }}
          >
            <div className="p-4 space-y-3">
              {/* Track info */}
              <div className="text-center">
                <motion.p
                  key={current}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm font-bold text-foreground truncate"
                >
                  🎵 {TRACKS[current].title}
                </motion.p>
                <p className="text-[10px] text-muted-foreground">Bad Bunny Vibes 🐰</p>
              </div>

              {/* Progress bar */}
              <div
                className="h-1.5 rounded-full cursor-pointer bg-secondary"
                onClick={seekTo}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    width: `${progress * 100}%`,
                    background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))',
                  }}
                />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleMute}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => changeTrack(-1)}
                  className="text-foreground"
                >
                  <SkipBack className="w-5 h-5" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
                    color: 'hsl(var(--primary-foreground))',
                    boxShadow: '0 4px 15px hsl(var(--primary) / 0.4)',
                  }}
                >
                  {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => changeTrack(1)}
                  className="text-foreground"
                >
                  <SkipForward className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Track list */}
              <div className="space-y-1">
                {TRACKS.map((t, i) => (
                  <motion.button
                    key={t.title}
                    whileHover={{ x: 4 }}
                    onClick={() => {
                      setCurrent(i);
                      const audio = audioRef.current;
                      if (audio) {
                        audio.src = t.src;
                        if (playing) audio.play();
                        setProgress(0);
                      }
                    }}
                    className={`w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors ${
                      i === current
                        ? 'bg-primary/20 text-primary font-semibold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    }`}
                  >
                    {i === current && playing ? '▶ ' : `${i + 1}. `}{t.title}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(!open)}
        className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg backdrop-blur-md border border-border/40 relative"
        style={{
          background: playing
            ? 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))'
            : 'hsl(var(--secondary) / 0.8)',
        }}
      >
        <Music className="w-5 h-5" style={{ color: playing ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))' }} />
        {playing && (
          <motion.div
            className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </motion.button>
    </div>
  );
}
