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
import { FloatingDinos, Sparkles, HeartBubbles } from './FloatingDinos';

function ThemeCard({ theme, selected, onClick }: { theme: DinoTheme; selected: boolean; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all min-w-[72px]",
        selected
          ? "border-current shadow-lg shadow-current/20"
          : "border-border/50 hover:border-border"
      )}
      style={{
        color: `hsl(${theme.colors.primary})`,
        background: selected
          ? `linear-gradient(135deg, hsl(${theme.colors.cardBack} / 0.2), hsl(${theme.colors.cardBackEnd} / 0.3))`
          : undefined,
      }}
    >
      <img src={theme.image} alt={theme.name} className="w-10 h-10 object-contain" />
      <span className="text-[10px] font-bold" style={{ color: `hsl(${theme.colors.primary})` }}>
        {theme.name}
      </span>
      {selected && (
        <motion.div
          layoutId="theme-check"
          className="w-2 h-2 rounded-full"
          style={{ background: `hsl(${theme.colors.primary})` }}
        />
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

  const currentTheme = DINO_THEMES.find(t => t.id === selectedTheme) || DINO_THEMES[3];

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
      // Show spinning dino for 3 seconds
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
    <div className="min-h-screen felt-texture flex items-center justify-center p-4 relative overflow-hidden">
      <FloatingDinos count={15} />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="w-full max-w-md space-y-8 relative z-10"
      >
        <div className="text-center space-y-3 relative">
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 150, damping: 12 }}
            className="flex flex-col items-center gap-2 relative"
          >
            <motion.img
              src={currentTheme.image}
              alt={currentTheme.name}
              className="w-24 h-24 object-contain drop-shadow-lg"
              animate={{
                y: [0, -8, 0],
                rotate: [0, 3, -3, 0],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
            <Sparkles color={currentTheme.colors.primary} count={8} />
            <motion.h1
              className="text-5xl font-display font-black gold-glow"
              style={{ color: `hsl(${currentTheme.colors.primary})` }}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              Dino Its
            </motion.h1>
          </motion.div>
          <motion.p
            className="text-muted-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Play the prehistoric card game with a friend online! RAWR! 🦖
          </motion.p>
          <HeartBubbles />
        </div>

        <div className="bg-card/80 backdrop-blur rounded-xl p-6 space-y-5 border border-border">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Your Name</label>
            <Input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="bg-secondary border-border"
              maxLength={20}
            />
          </div>

          {/* Dino Theme Picker */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Choose Your Dino</label>
            <div className="flex gap-2 flex-wrap justify-center">
              {DINO_THEMES.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  selected={selectedTheme === theme.id}
                  onClick={() => handleThemeSelect(theme.id)}
                />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              {currentTheme.emoji} {currentTheme.name} — {currentTheme.description}
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={createRoom}
              disabled={loading}
              className="w-full font-bold text-lg h-12"
              style={{
                background: `linear-gradient(135deg, hsl(${currentTheme.colors.primary}), hsl(${currentTheme.colors.primaryGlow}))`,
                color: 'hsl(0 0% 100%)',
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

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground uppercase">or join a den</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="flex gap-2">
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Den code"
                className="bg-secondary border-border uppercase tracking-widest font-mono"
                maxLength={6}
              />
              <Button
                onClick={joinRoom}
                variant="outline"
                className="px-6"
                style={{
                  borderColor: `hsl(${currentTheme.colors.primary})`,
                  color: `hsl(${currentTheme.colors.primary})`,
                }}
              >
                Join
              </Button>
            </div>
          </div>
        </div>

        <motion.p
          className="text-center text-xs text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          Create a den and share the code with your dino buddy to start playing! 🌋
        </motion.p>

        {/* Stomping dinos at the bottom */}
        <div className="flex justify-center gap-6 pt-2">
          {DINO_THEMES.slice(0, 3).map((t, i) => (
            <motion.img
              key={t.id}
              src={t.image}
              alt={t.name}
              className="w-8 h-8 object-contain opacity-30"
              animate={{
                y: [0, -6, 0],
                rotate: [0, i % 2 === 0 ? 5 : -5, 0],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.4,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
