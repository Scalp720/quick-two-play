import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

const TRACKS = [
  { title: 'DtMF', src: '/music/DtMF.mp3' },
  { title: 'EoO', src: '/music/EoO.mp3' },
  { title: 'Tití Me Preguntó', src: '/music/Titi_Me_Pregunto.mp3' },
];

interface SpotifyState {
  playing: boolean;
  currentTrack: number;
  progress: number;
  lastUpdated: number;
}

interface SpotifyPlayerProps {
  syncState?: SpotifyState;
  onSyncStateChange?: (state: SpotifyState) => void;
  className?: string; // Add optional className
}

export function SpotifyPlayer({ syncState, onSyncStateChange, className = 'bottom-4 right-4' }: SpotifyPlayerProps) {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- NEW: Sync Logic ---
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (!syncState || !audioRef.current) return;
    
    // Set flag so we don't infinitely re-trigger updates
    isSyncingRef.current = true;
    
    const audio = audioRef.current;
    
    // 1. Check if track changed
    if (current !== syncState.currentTrack) {
      setCurrent(syncState.currentTrack);
      audio.src = TRACKS[syncState.currentTrack].src;
    }
    
    // 2. Play/Pause
    if (syncState.playing !== playing) {
      setPlaying(syncState.playing);
      if (syncState.playing) {
        audio.play().catch((err) => {
          console.warn("Autoplay prevented on sync:", err);
          // Don't revert playing state in UI, so user knows it *should* be playing 
          // and might just need a tap on the screen
        });
      } else {
        audio.pause();
      }
    } else if (syncState.playing && audio.paused && audio.src) {
      // Force play if it was supposed to be playing but got paused (e.g. after src change)
      audio.play().catch(e => console.warn("Force play failed:", e));
    }

    // 3. Time Sync (only if diff > 1.5s to prevent stutter)
    // We estimate what the progress should be now, assuming lastUpdated was accurate.
    const timeSinceUpdate = (Date.now() - syncState.lastUpdated) / 1000; // in seconds
    const targetTime = (syncState.progress * (audio.duration || 0)) + (syncState.playing ? timeSinceUpdate : 0);
    
    if (audio.duration && Math.abs(audio.currentTime - targetTime) > 1.5) {
      audio.currentTime = targetTime;
    }

    // Free the flag
    setTimeout(() => { isSyncingRef.current = false; }, 100);

  }, [syncState]); // Intentionally omitting playing/current to avoid local loopbacks.

  // Helper to publish changes if prop is provided
  const triggerSync = useCallback((updates: Partial<SpotifyState>) => {
    if (isSyncingRef.current) return;
    if (onSyncStateChange) {
      const audio = audioRef.current;
      const duration = audio?.duration || 1;
      const prog = (audio?.currentTime || 0) / duration;
      
      onSyncStateChange({
        playing,
        currentTrack: current,
        progress: prog,
        lastUpdated: Date.now(),
        ...updates
      });
    }
  }, [playing, current, onSyncStateChange]);


  useEffect(() => {
    const audio = new Audio(TRACKS[0].src);
    audio.preload = 'auto';
    audioRef.current = audio;

    audio.addEventListener('timeupdate', () => {
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
      // Optional: don't bombard the server with timeupdates, just sync explicit actions.
    });

    audio.addEventListener('ended', () => {
      // Auto-advance to next track
      setCurrent(prev => {
        const next = (prev + 1) % TRACKS.length;
        audio.src = TRACKS[next].src;
        if (playing) audio.play();
        triggerSync({ currentTrack: next, progress: 0 });
        return next;
      });
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []); // Note: playing state dependency removed from hook array to avoid closure trap, see below.

  // Keep triggerSync up to date over event listeners using ref if needed.
  const playingRef = useRef(playing);
  useEffect(() => { playingRef.current = playing; }, [playing]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const isPlaying = playing;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
    setPlaying(!isPlaying);
    const prog = audio.duration ? (audio.currentTime / audio.duration) : 0;
    triggerSync({ playing: !isPlaying, progress: prog });
  }, [playing, triggerSync]);

  const changeTrack = useCallback((dir: 1 | -1) => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrent(prev => {
      const next = (prev + dir + TRACKS.length) % TRACKS.length;
      audio.src = TRACKS[next].src;
      // Capture the current playing state directly from the ref
      const currentlyPlaying = playingRef.current;
      if (currentlyPlaying) {
        audio.play().catch(console.error);
      }
      setProgress(0);
      
      // Delay the sync trigger slightly to allow local state to settle
      setTimeout(() => {
        triggerSync({ currentTrack: next, progress: 0, playing: currentlyPlaying });
      }, 50);
      
      return next;
    });
  }, [triggerSync]);

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
    triggerSync({ progress: pct });
  };

  return (
    <div className={cn("fixed z-[60]", className)}>
      <AnimatePresence>
        {open && (
          <motion.div
            drag
            dragConstraints={{ left: -300, right: 300, top: -500, bottom: 50 }}
            dragElastic={0.1}
            dragMomentum={false}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="mb-3 rounded-2xl overflow-hidden shadow-2xl w-64 sm:w-72 backdrop-blur-xl border border-border/40 fixed bottom-16 right-0 sm:bottom-0 sm:right-0 sm:relative origin-bottom-right"
            style={{
              background: 'hsl(var(--card) / 0.9)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
            }}
          >
            <div className="p-3 sm:p-4 space-y-3 cursor-grab active:cursor-grabbing">
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
                        const currentlyPlaying = playingRef.current;
                        if (currentlyPlaying) {
                          audio.play().catch(console.error);
                        }
                        setProgress(0);
                        
                        // Delay sync slightly for DOM to catch up
                        setTimeout(() => {
                          triggerSync({ currentTrack: i, progress: 0, playing: currentlyPlaying });
                        }, 50);
                      }
                    }}
                    className={`w-full text-left text-[10px] sm:text-xs px-2 py-1.5 rounded-lg transition-colors ${
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
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-lg backdrop-blur-md border border-border/40 relative ml-auto"
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
