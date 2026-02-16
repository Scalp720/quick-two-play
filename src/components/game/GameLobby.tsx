import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { generateRoomCode, generatePlayerId } from '@/lib/tongits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export function GameLobby() {
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const getOrCreatePlayerId = () => {
    let id = localStorage.getItem('tongits_player_id');
    if (!id) {
      id = generatePlayerId();
      localStorage.setItem('tongits_player_id', id);
    }
    return id;
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
          players: [{ playerId, name: playerName.trim() }],
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
            className="text-5xl font-display font-black text-primary gold-glow"
          >
            Tong Its
          </motion.h1>
          <p className="text-muted-foreground">
            Play the classic Filipino card game with a friend online
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

          <div className="space-y-3">
            <Button
              onClick={createRoom}
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-lg h-12"
            >
              {loading ? 'Creating...' : '🃏 Create Game Room'}
            </Button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground uppercase">or join a room</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="flex gap-2">
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Room code"
                className="bg-secondary border-border uppercase tracking-widest font-mono"
                maxLength={6}
              />
              <Button
                onClick={joinRoom}
                variant="outline"
                className="border-primary text-primary hover:bg-primary/10 px-6"
              >
                Join
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Create a room and share the code with your friend to start playing!
        </p>
      </motion.div>
    </div>
  );
}
