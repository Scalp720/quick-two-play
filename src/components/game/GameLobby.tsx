import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { generateRoomCode, generatePlayerId } from '@/lib/tongits';
import { DINO_THEMES, getSavedTheme, saveTheme, DinoTheme } from '@/lib/dinoThemes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { FloatingDinos, Sparkles, HeartBubbles, Fireflies } from './FloatingDinos';
import { SpotifyPlayer } from './SpotifyPlayer';

function ThemeCard({ theme, selected, onClick }: { theme: DinoTheme; selected: boolean; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.08, y: -4 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all min-w-[80px] relative",
        selected
          ? "border-current shadow-lg"
          : "border-border/30 hover:border-border/60"
      )}
      style={{
        color: `hsl(${theme.colors.primary})`,
        background: selected
          ? `linear-gradient(135deg, hsl(${theme.colors.cardBack} / 0.3), hsl(${theme.colors.cardBackEnd} / 0.4))`
          : 'hsl(var(--secondary) / 0.3)',
        boxShadow: selected ? `0 4px 20px hsl(${theme.colors.primary} / 0.3), 0 0 40px hsl(${theme.colors.primary} / 0.1)` : undefined,
      }}
    >
      <motion.img
        src={theme.image}
        alt={theme.name}
        className="w-12 h-12 object-contain drop-shadow-md"
        animate={selected ? { y: [0, -4, 0], rotate: [0, 5, -5, 0] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span className="text-[10px] font-bold tracking-wide" style={{ color: `hsl(${theme.colors.primary})` }}>
        {theme.name}
      </span>
      {selected && (
        <>
          <motion.div
            layoutId="theme-check"
            className="w-2.5 h-2.5 rounded-full"
            style={{
              background: `hsl(${theme.colors.primary})`,
              boxShadow: `0 0 8px hsl(${theme.colors.primary} / 0.6)`,
            }}
          />
          <Sparkles color={theme.colors.primary} count={5} />
        </>
      )}
    </motion.button>
  );
}

export function GameLobby() {
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(getSavedTheme());
  const navigate = useNavigate();

  const currentTheme = DINO_THEMES.find(t => t.id === selectedTheme) || DINO_THEMES[0];

  const getOrCreatePlayerId = () => {
    let id = localStorage.getItem('tongits_player_id');
    if (!id) {
      id = generatePlayerId();
      localStorage.setItem('tongits_player_id', id);
    }
    return id;
  };

  const handleThemeSelect = (id: string) => {
    setSelectedTheme(id);
    saveTheme(id);
  };

  const createRoom = async () => {
    if (!playerName.trim()) {
      toast.error('Enter your name first!');
      return;
    }
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));

      const roomCode = generateRoomCode();
      const playerId = getOrCreatePlayerId();
      localStorage.setItem('tongits_player_name', playerName.trim());

      const { error } = await supabase.from('game_rooms').insert({
        room_code: roomCode,
        status: 'waiting',
        game_state: {
          players: [{ playerId, name: playerName.trim(), theme: selectedTheme }],
        },
      });

      if (error) throw error;
      navigate(`/game/${roomCode}`);
    } catch (err: any) {
      toast.error('Failed to create room: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!playerName.trim()) {
      toast.error('Enter your name first!');
      return;
    }
    if (!joinCode.trim()) {
      toast.error('Enter a room code!');
      return;
    }
    localStorage.setItem('tongits_player_name', playerName.trim());
    navigate(`/game/${joinCode.trim().toUpperCase()}`);
  };

  return (
    <div className="min-h-screen felt-texture aurora-bg flex items-center justify-center p-4 relative overflow-hidden">
      <FloatingDinos count={8} />
      <Fireflies count={12} />
      <SpotifyPlayer />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="w-full max-w-md space-y-8 relative z-10"
      >
        {/* Title section with enhanced glow */}
        <div className="text-center space-y-3 relative">
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 150, damping: 12 }}
            className="flex flex-col items-center gap-3 relative"
          >
            <motion.div className="relative">
              <motion.img
                src={currentTheme.image}
                alt={currentTheme.name}
                className="w-28 h-28 object-contain drop-shadow-2xl"
                animate={{
                  y: [0, -10, 0],
                  rotate: [0, 3, -3, 0],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
              {/* Glow ring behind mascot */}
              <motion.div
                className="absolute inset-0 rounded-full -z-10"
                style={{
                  background: `radial-gradient(circle, hsl(${currentTheme.colors.primary} / 0.2) 0%, transparent 70%)`,
                }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>
            <Sparkles color={currentTheme.colors.primary} count={10} />
            <motion.h1
              className="text-5xl font-display font-black gold-glow tracking-wider"
              style={{ color: `hsl(${currentTheme.colors.primary})` }}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              Dino Its
            </motion.h1>
            <motion.div
              className="h-0.5 w-32 rounded-full mx-auto"
              style={{
                background: `linear-gradient(90deg, transparent, hsl(${currentTheme.colors.primary}), transparent)`,
              }}
              animate={{ opacity: [0.3, 0.8, 0.3], scaleX: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
          <motion.p
            className="text-muted-foreground text-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Play the prehistoric card game with your love! RAWR! 🦖💕
          </motion.p>
          <HeartBubbles />
        </div>

        {/* Main card - glassmorphism */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="glass-panel rounded-2xl p-6 space-y-5"
        >
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block flex items-center gap-1.5">
              <span>💝</span> Your Name
            </label>
            <Input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name, love"
              className="bg-secondary/60 border-border/50 backdrop-blur-sm focus:ring-2 focus:ring-primary/40"
              maxLength={20}
            />
          </div>

          {/* Dino Theme Picker */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-2 block flex items-center gap-1.5">
              <span>🦖</span> Choose Your Dino
            </label>
            <div className="flex gap-3 flex-wrap justify-center">
              {DINO_THEMES.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  selected={selectedTheme === theme.id}
                  onClick={() => handleThemeSelect(theme.id)}
                />
              ))}
            </div>
            <motion.p
              key={currentTheme.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[10px] text-muted-foreground text-center mt-2"
            >
              {currentTheme.emoji} {currentTheme.name} — {currentTheme.description}
            </motion.p>
          </div>

          <div className="space-y-3">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={createRoom}
                disabled={loading}
                className="w-full font-bold text-lg h-12 btn-glow relative overflow-hidden border-0"
                style={{
                  background: `linear-gradient(135deg, hsl(${currentTheme.colors.primary}), hsl(${currentTheme.colors.primaryGlow}))`,
                  color: 'hsl(0 0% 100%)',
                  boxShadow: `0 4px 20px hsl(${currentTheme.colors.primary} / 0.4)`,
                }}
              >
                {loading ? (
                  <motion.img
                    src={currentTheme.image}
                    alt="Loading"
                    className="w-7 h-7 object-contain"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                ) : (
                  <>
                    <img src={currentTheme.image} alt={currentTheme.name} className="w-6 h-6 object-contain mr-1 inline-block" />
                    Create Dino Den
                  </>
                )}
              </Button>
            </motion.div>

            <div className="flex items-center gap-3">
              <motion.div
                className="h-px flex-1"
                style={{ background: `linear-gradient(90deg, transparent, hsl(var(--border)), transparent)` }}
              />
              <span className="text-xs text-muted-foreground uppercase tracking-widest">or join</span>
              <motion.div
                className="h-px flex-1"
                style={{ background: `linear-gradient(90deg, transparent, hsl(var(--border)), transparent)` }}
              />
            </div>

            <div className="flex gap-2">
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Den code"
                className="bg-secondary/60 border-border/50 uppercase tracking-widest font-mono backdrop-blur-sm"
                maxLength={6}
              />
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={joinRoom}
                  variant="outline"
                  className="px-6"
                  style={{
                    borderColor: `hsl(${currentTheme.colors.primary})`,
                    color: `hsl(${currentTheme.colors.primary})`,
                    boxShadow: `0 0 15px hsl(${currentTheme.colors.primary} / 0.15)`,
                  }}
                >
                  Join
                </Button>
              </motion.div>
            </div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => navigate('/solitaire')}
                variant="secondary"
                className="w-full font-bold text-lg h-12 relative overflow-hidden"
                style={{
                  background: `hsl(var(--secondary))`,
                  color: `hsl(${currentTheme.colors.primary})`,
                  border: `2px solid hsl(${currentTheme.colors.primary} / 0.3)`,
                }}
              >
                <img src={currentTheme.image} alt={currentTheme.name} className="w-6 h-6 object-contain mr-1 inline-block" />
                Play Solitaire
              </Button>
            </motion.div>
          </div>
        </motion.div>

        <motion.p
          className="text-center text-xs text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          Share the den code with your dino buddy to play! 🌋💕
        </motion.p>

        {/* Stomping dinos at the bottom */}
        <div className="flex justify-center gap-8 pt-2">
          {DINO_THEMES.slice(0, 3).map((t, i) => (
            <motion.div key={t.id} className="relative">
              <motion.img
                src={t.image}
                alt={t.name}
                className="w-10 h-10 object-contain opacity-40"
                animate={{
                  y: [0, -8, 0],
                  rotate: [0, i % 2 === 0 ? 6 : -6, 0],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: 'easeInOut',
                }}
              />
              {/* Footprint shadow */}
              <motion.div
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-1.5 rounded-full bg-foreground/5"
                animate={{ scaleX: [0.8, 1, 0.8], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }}
              />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
