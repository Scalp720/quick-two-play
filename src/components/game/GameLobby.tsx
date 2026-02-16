import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { generateRoomCode, generatePlayerId } from '@/lib/tongits';
import { DINO_THEMES, getSavedTheme, saveTheme, DinoTheme } from '@/lib/dinoThemes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
      <span className="text-2xl">{theme.emoji}</span>
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
    <div className="min-h-screen felt-texture flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-3">
          <motion.h1
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="text-5xl font-display font-black gold-glow"
            style={{ color: `hsl(${currentTheme.colors.primary})` }}
          >
            {currentTheme.emoji} Dino Its
          </motion.h1>
          <p className="text-muted-foreground">
            Play the prehistoric card game with a friend online! RAWR! 🦖
          </p>
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
              {loading ? 'Hatching...' : `${currentTheme.emoji} Create Dino Den`}
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

        <p className="text-center text-xs text-muted-foreground">
          Create a den and share the code with your dino buddy to start playing! 🌋
        </p>
      </motion.div>
    </div>
  );
}
