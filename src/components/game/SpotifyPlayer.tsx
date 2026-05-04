import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Headphones, Music2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Track {
  title: string;
  src: string;
}

interface Playlist {
  id: string;
  name: string;
  artist: string;
  image: string;
  emoji: string;
  tracks: Track[];
}

const PLAYLISTS: Playlist[] = [
  {
    id: 'bad-bunny',
    name: 'Bad Bunny Vibes',
    artist: 'Bad Bunny 🐰',
    image: '/badbunny.jpg',
    emoji: '🐰',
    tracks: [
      { title: 'Andrea', src: '/music/bad-bunny/Andrea.mp3' },
      { title: 'BAILE INoLVIDABLE', src: '/music/bad-bunny/BAILE INoLVIDABLE.mp3' },
      { title: 'CAFé CON RON', src: '/music/bad-bunny/CAFé CON RON.mp3' },
      { title: 'DtMF', src: '/music/bad-bunny/DtMF.mp3' },
      { title: 'DÁKITI', src: '/music/bad-bunny/DÁKITI.mp3' },
      { title: 'EL CLúB', src: '/music/bad-bunny/EL CLúB.mp3' },
      { title: 'Enséñame a Bailar', src: '/music/bad-bunny/Enséñame a Bailar.mp3' },
      { title: 'EoO', src: '/music/bad-bunny/EoO.mp3' },
      { title: 'LA CANCIÓN', src: '/music/bad-bunny/LA CANCIÓN.mp3' },
      { title: 'La Romana', src: '/music/bad-bunny/La Romana.mp3' },
      { title: 'MONACO', src: '/music/bad-bunny/MONACO.mp3' },
      { title: 'Me Fui de Vacaciones', src: '/music/bad-bunny/Me Fui de Vacaciones.mp3' },
      { title: 'Me Porto Bonito', src: '/music/bad-bunny/Me Porto Bonito.mp3' },
      { title: 'Moscow Mule', src: '/music/bad-bunny/Moscow Mule.mp3' },
      { title: 'NUEVAYoL', src: '/music/bad-bunny/NUEVAYoL.mp3' },
      { title: 'Ojitos Lindos', src: '/music/bad-bunny/Ojitos Lindos.mp3' },
      { title: 'PERFuMITO NUEVO', src: '/music/bad-bunny/PERFuMITO NUEVO.mp3' },
      { title: 'PERRO NEGRO', src: '/music/bad-bunny/PERRO NEGRO.mp3' },
      { title: 'Safaera', src: '/music/bad-bunny/Safaera.mp3' },
      { title: 'Tití Me Preguntó', src: '/music/bad-bunny/Titi_Me_Pregunto.mp3' },
      { title: 'VeLDÁ', src: '/music/bad-bunny/VeLDÁ.mp3' },
      { title: 'WELTiTA', src: '/music/bad-bunny/WELTiTA.mp3' },
      { title: 'Yo No Soy Celoso', src: '/music/bad-bunny/Yo No Soy Celoso.mp3' },
      { title: 'Yo Perreo Sola', src: '/music/bad-bunny/Yo Perreo Sola.mp3' },
    ]
  },
  {
    id: 'sabrina-carpenter',
    name: 'Sabrina Carpenter Vibes',
    artist: 'Sabrina Carpenter 🎤',
    image: '/sabrina.avif',
    emoji: '🎤',
    tracks: [
      { title: 'Espresso', src: '/music/sabrina-carpenter/Espresso_spotdown.org.mp3' },
      { title: 'Nonsense', src: '/music/sabrina-carpenter/Nonsense_spotdown.org.mp3' },
      { title: 'Bed Chem', src: '/music/sabrina-carpenter/Bed Chem_spotdown.org.mp3' },
      { title: 'Juno', src: '/music/sabrina-carpenter/Juno_spotdown.org.mp3' },
      { title: 'Please Please Please', src: '/music/sabrina-carpenter/Please Please Please_spotdown.org.mp3' },
      { title: 'Feather', src: '/music/sabrina-carpenter/Feather_spotdown.org.mp3' },
      { title: 'Taste', src: '/music/sabrina-carpenter/Taste_spotdown.org.mp3' },
      { title: 'Coincidence', src: '/music/sabrina-carpenter/Coincidence_spotdown.org.mp3' },
      { title: 'Because I Liked a Boy', src: '/music/sabrina-carpenter/because i liked a boy_spotdown.org.mp3' },
      { title: 'Don\'t Smile', src: '/music/sabrina-carpenter/Don\'t Smile_spotdown.org.mp3' },
      { title: 'Good Graces', src: '/music/sabrina-carpenter/Good Graces_spotdown.org.mp3' },
      { title: 'Opposite', src: '/music/sabrina-carpenter/opposite_spotdown.org.mp3' },
      { title: 'Read Your Mind', src: '/music/sabrina-carpenter/Read your Mind_spotdown.org.mp3' },
      { title: 'Sharpest Tool', src: '/music/sabrina-carpenter/Sharpest Tool_spotdown.org.mp3' },
    ]
  }
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
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('bad-bunny');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentPlaylist = PLAYLISTS.find(p => p.id === selectedPlaylistId) || PLAYLISTS[0];
  const TRACKS = currentPlaylist.tracks;

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
  }, [triggerSync, TRACKS]);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !muted;
    setMuted(!muted);
  }, [muted]);

  const handlePlaylistChange = (playlistId: string) => {
    const audio = audioRef.current;
    if (!audio) return;

    setSelectedPlaylistId(playlistId);
    setCurrent(0);
    setProgress(0);

    const playlist = PLAYLISTS.find(p => p.id === playlistId);
    if (playlist && playlist.tracks.length > 0) {
      audio.src = playlist.tracks[0].src;
      if (playing) {
        audio.play().catch(console.error);
      }
      triggerSync({ currentTrack: 0, progress: 0 });
    }
  };

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
            <div className="p-3 sm:p-4 space-y-4 cursor-grab active:cursor-grabbing">
              {/* Playlist selector with icons */}
              <div className="flex gap-3 mb-3 justify-center">
                {PLAYLISTS.map((playlist) => (
                  <motion.button
                    key={playlist.id}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handlePlaylistChange(playlist.id)}
                    className={`relative w-14 h-14 rounded-full flex items-center justify-center font-bold transition-all shadow-lg ${
                      selectedPlaylistId === playlist.id
                        ? 'ring-2 ring-primary/80 shadow-primary/50'
                        : 'hover:ring-2 hover:ring-primary/40'
                    }`}
                    style={{
                      background: selectedPlaylistId === playlist.id
                        ? `linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7)))`
                        : 'hsl(var(--secondary) / 0.7)',
                      boxShadow: selectedPlaylistId === playlist.id
                        ? `0 0 20px hsl(var(--primary) / 0.4)`
                        : undefined
                    }}
                    title={playlist.name}
                  >
                    <span className="text-2xl">{playlist.emoji}</span>
                    {selectedPlaylistId === playlist.id && (
                      <motion.div
                        layoutId="playlistIndicator"
                        className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    )}
                  </motion.button>
                ))}
              </div>

              {/* Track info card */}
              <div className="rounded-xl p-4 space-y-3" style={{
                background: `linear-gradient(135deg, hsl(var(--secondary) / 0.8), hsl(var(--secondary) / 0.5))`,
                border: `2px solid hsl(var(--primary) / 0.2)`,
                backdropFilter: 'blur(10px)'
              }}>
                <div className="flex items-center gap-4">
                  <motion.div
                    layoutId="playlistCover"
                    className="relative"
                  >
                    <img
                      src={currentPlaylist.image}
                      alt={currentPlaylist.name}
                      className="w-16 h-16 rounded-lg object-cover shadow-md ring-2 ring-primary/40"
                    />
                    <motion.div
                      className="absolute -top-2 -right-2 bg-primary rounded-full p-2"
                      animate={playing ? { rotate: 360 } : {}}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    >
                      <Music2 className="w-4 h-4 text-primary-foreground" />
                    </motion.div>
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <motion.p
                      key={current}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-sm font-bold text-foreground truncate leading-tight"
                    >
                      {TRACKS[current].title}
                    </motion.p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Headphones className="w-3 h-3" />
                      {currentPlaylist.artist}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {current + 1} / {TRACKS.length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div
                className="h-2 rounded-full cursor-pointer bg-secondary/60 overflow-hidden hover:h-2.5 transition-all"
                onClick={seekTo}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    width: `${progress * 100}%`,
                    background: `linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))`,
                    boxShadow: '0 0 10px hsl(var(--primary) / 0.5)',
                  }}
                  layoutId="progressBar"
                />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={toggleMute}
                  className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-secondary/50"
                >
                  {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => changeTrack(-1)}
                  className="text-foreground p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <SkipBack className="w-5 h-5" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={togglePlay}
                  className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                  style={{
                    background: playing
                      ? `linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))`
                      : `linear-gradient(135deg, hsl(var(--primary) / 0.6), hsl(var(--accent) / 0.6))`,
                    color: 'hsl(var(--primary-foreground))',
                    boxShadow: playing ? '0 6px 20px hsl(var(--primary) / 0.5)' : '0 4px 12px hsl(var(--primary) / 0.3)',
                  }}
                >
                  {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => changeTrack(1)}
                  className="text-foreground p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <SkipForward className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Track list */}
              <div className="space-y-1 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                <p className="text-[10px] font-semibold text-muted-foreground px-2 mb-2 uppercase tracking-wider">Playlist</p>
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
                    className={`w-full text-left text-[10px] sm:text-xs px-2 py-2 rounded-lg transition-all flex items-center gap-2 ${i === current
                        ? 'bg-primary/30 text-primary font-semibold border-l-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                      }`}
                  >
                    <span className="text-[8px] w-5 text-right">{i + 1}.</span>
                    <span className="truncate flex-1">{t.title}</span>
                    {i === current && playing && (
                      <motion.span
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity }}
                        className="text-primary"
                      >
                        ▶
                      </motion.span>
                    )}
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
