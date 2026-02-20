import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  GameState, Card, initializeGame, generatePlayerId, isValidMeld,
  canLayOff, canLayOffMultiple, calculateHandPoints, sortHand, sortByRank, sortByGroups, getSuitSymbol, getSuitColor,
} from '@/lib/tongits';
import { PlayingCard, CardBack } from '@/components/game/PlayingCard';
import { CoinFlip } from '@/components/game/CoinFlip';
import { MeldDisplay } from '@/components/game/MeldDisplay';
import { EmotePicker, EmoteBubble } from '@/components/game/EmoteDisplay';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Copy, ArrowLeft } from 'lucide-react';
import { playCardDraw, playCardDiscard, playMeld, playWin, playLose, playClick, playFight } from '@/lib/sounds';
import { getThemeById, getSavedTheme } from '@/lib/dinoThemes';
import { FloatingDinos, Sparkles } from '@/components/game/FloatingDinos';
import dinoDance from '@/assets/dino-dance.gif';

export default function GamePage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerIndex, setPlayerIndex] = useState<number>(-1);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [heldCards, setHeldCards] = useState<Card[]>([]);
  const [waiting, setWaiting] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sortMode, setSortMode] = useState<'suit' | 'rank' | 'group'>('suit');
  const [drawAnim, setDrawAnim] = useState<'deck' | 'discard' | null>(null);
  const [discardAnim, setDiscardAnim] = useState<string | null>(null);
  const [activeEmote, setActiveEmote] = useState<{ emote: string; from: number } | null>(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [disconnectTimer, setDisconnectTimer] = useState(60);
  const disconnectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerId = useRef(getOrCreatePlayerId());

  function getOrCreatePlayerId() {
    let id = localStorage.getItem('tongits_player_id');
    if (!id) {
      id = generatePlayerId();
      localStorage.setItem('tongits_player_id', id);
    }
    return id;
  }

  const playerName = localStorage.getItem('tongits_player_name') || 'Player';
  const myTheme = getThemeById(getSavedTheme());


  // Join room and subscribe
  useEffect(() => {
    if (!roomCode) return;

    const joinAndSubscribe = async () => {
      // Fetch room
      const { data: room, error } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (error || !room) {
        toast.error('Room not found!');
        navigate('/');
        return;
      }

      setRoomId(room.id);
      const state = room.game_state as any;

      // Check if we're already in the room
      const existingIndex = state.players?.findIndex((p: any) => p.playerId === playerId.current);

      if (existingIndex >= 0) {
        setPlayerIndex(existingIndex);
        if (state.phase && state.phase !== 'waiting') {
          setGameState(state as GameState);
          setWaiting(false);
        } else {
          setWaiting(state.players.length < 2);
        }
      } else if (state.players?.length < 2) {
        // Join as player 2
        const updatedPlayers = [
          ...state.players,
          { playerId: playerId.current, name: playerName, theme: getSavedTheme() },
        ];
        setPlayerIndex(1);

        // Initialize game
        const newGame = initializeGame(
          updatedPlayers[0].playerId,
          updatedPlayers[1].playerId,
          updatedPlayers[0].name,
          playerName
        );
        // Inject themes into players
        (newGame.players[0] as any).theme = updatedPlayers[0].theme;
        (newGame.players[1] as any).theme = getSavedTheme();

        await supabase
          .from('game_rooms')
          .update({ game_state: newGame as any, status: 'playing' })
          .eq('id', room.id);

        setGameState(newGame);
        setWaiting(false);
      } else {
        toast.error('Room is full!');
        navigate('/');
        return;
      }

      // Subscribe to game state changes
      const channel = supabase
        .channel(`room-${room.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `id=eq.${room.id}` },
          (payload) => {
            const newState = payload.new.game_state as GameState;
            setGameState(newState);
            if (newState.phase !== 'waiting') {
              setWaiting(false);
            }
          }
        )
        .subscribe();

      // Presence channel for disconnect detection
      const presenceChannel = supabase
        .channel(`presence-${room.id}`)
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          const presentPlayers = Object.values(state).flat() as any[];
          const opponentPresent = presentPlayers.some(
            (p: any) => p.playerId !== playerId.current
          );
          // Only track opponent disconnection after both players have joined
          setOpponentDisconnected(presentPlayers.length > 0 && !opponentPresent && presentPlayers.some((p: any) => p.playerId === playerId.current));
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({ playerId: playerId.current });
          }
        });

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(presenceChannel);
      };
    };

    joinAndSubscribe();
  }, [roomCode, navigate, playerName]);

  const updateGame = useCallback(async (newState: GameState) => {
    if (!roomId) return;
    setGameState(newState);
    await supabase
      .from('game_rooms')
      .update({ game_state: newState as any })
      .eq('id', roomId);
  }, [roomId]);

  const isMyTurn = gameState?.currentTurn === playerIndex;
  const myHand = gameState?.players[playerIndex]?.hand || [];
  const opponentIndex = playerIndex === 0 ? 1 : 0;
  const opponent = gameState?.players[opponentIndex];
  const me = gameState?.players[playerIndex];
  const opponentTheme = getThemeById((opponent as any)?.theme || 'raptor');

  // Disconnect timer - countdown when opponent leaves
  useEffect(() => {
    if (opponentDisconnected && !waiting && gameState?.phase === 'playing') {
      setDisconnectTimer(60);
      disconnectTimerRef.current = setInterval(() => {
        setDisconnectTimer(prev => {
          if (prev <= 1) {
            if (disconnectTimerRef.current) clearInterval(disconnectTimerRef.current);
            if (gameState && roomId) {
              const winState: GameState = {
                ...gameState,
                phase: 'finished',
                winner: playerIndex,
                winMethod: `${opponent?.name} disconnected! ${me?.name} wins by default.`,
              };
              updateGame(winState);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (disconnectTimerRef.current) {
        clearInterval(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
    }
    return () => {
      if (disconnectTimerRef.current) clearInterval(disconnectTimerRef.current);
    };
  }, [opponentDisconnected, waiting, gameState?.phase]);

  const drawFromDeck = useCallback(() => {
    if (!gameState || !isMyTurn || gameState.turnPhase !== 'draw') return;
    if (gameState.deck.length === 0) {
      // Stock out - determine winner by points
      const p0Points = calculateHandPoints(gameState.players[0].hand);
      const p1Points = calculateHandPoints(gameState.players[1].hand);
      const winner = p0Points <= p1Points ? 0 : 1;
      updateGame({
        ...gameState,
        phase: 'finished',
        winner,
        winMethod: `Stock out! ${gameState.players[winner].name} wins with ${Math.min(p0Points, p1Points)} points!`,
      });
      return;
    }

    const newDeck = [...gameState.deck];
    const card = newDeck.pop()!;
    const newHand = [...myHand, card];
    const newPlayers = [...gameState.players];
    newPlayers[playerIndex] = { ...newPlayers[playerIndex], hand: newHand };

    playCardDraw();
    setDrawAnim('deck');
    setTimeout(() => setDrawAnim(null), 400);
    updateGame({
      ...gameState,
      deck: newDeck,
      players: newPlayers,
      turnPhase: 'action',
      lastAction: `${me?.name} drew from deck`,
    });
  }, [gameState, isMyTurn, myHand, playerIndex, updateGame, me]);

  const canPickDiscard = useCallback(() => {
    if (!gameState || !myHand) return false;
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    if (!topCard) return false;
    // Check if top discard can form a meld with any 2+ cards in hand
    for (let i = 0; i < myHand.length; i++) {
      for (let j = i + 1; j < myHand.length; j++) {
        if (isValidMeld([topCard, myHand[i], myHand[j]])) return true;
      }
      // Check 3-card combos for runs
      for (let j = i + 1; j < myHand.length; j++) {
        for (let k = j + 1; k < myHand.length; k++) {
          if (isValidMeld([topCard, myHand[i], myHand[j], myHand[k]])) return true;
        }
      }
    }
    // Check if it can lay off on any existing meld
    const allMelds = gameState.players.flatMap(p => p.melds);
    for (const meld of allMelds) {
      if (canLayOff(topCard, meld)) return true;
    }
    return false;
  }, [gameState, myHand]);

  const drawFromDiscard = useCallback(() => {
    if (!gameState || !isMyTurn || gameState.turnPhase !== 'draw') return;
    if (gameState.discardPile.length === 0) return;
    if (!canPickDiscard()) {
      toast.error('You can only pick from discard if it pairs with your cards!');
      return;
    }

    const newDiscard = [...gameState.discardPile];
    const card = newDiscard.pop()!;
    const newHand = [...myHand, card];
    const newPlayers = [...gameState.players];
    newPlayers[playerIndex] = { ...newPlayers[playerIndex], hand: newHand };

    playCardDraw();
    setDrawAnim('discard');
    setTimeout(() => setDrawAnim(null), 400);
    updateGame({
      ...gameState,
      discardPile: newDiscard,
      players: newPlayers,
      turnPhase: 'action',
      lastAction: `${me?.name} picked up from discard`,
    });
  }, [gameState, isMyTurn, myHand, playerIndex, updateGame, me]);

  const toggleCardSelection = useCallback((cardId: string) => {
    playClick();
    setSelectedCards(prev =>
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  }, []);

  // Move selected cards from hand to hold zone
  const holdCards = useCallback(() => {
    if (!gameState) return;
    const cardsToHold = myHand.filter(c => selectedCards.includes(c.id) && !heldCards.some(h => h.id === c.id));
    if (cardsToHold.length === 0) return;
    playClick();
    setHeldCards(prev => [...prev, ...cardsToHold]);
    setSelectedCards([]);
  }, [gameState, myHand, selectedCards, heldCards]);

  // Return selected held cards back to hand
  const returnHeldCards = useCallback((cardIds: string[]) => {
    playClick();
    setHeldCards(prev => prev.filter(c => !cardIds.includes(c.id)));
    setSelectedCards([]);
  }, []);

  // Return all held cards
  const returnAllHeld = useCallback(() => {
    playClick();
    setHeldCards([]);
    setSelectedCards([]);
  }, []);

  const meldCards = useCallback(() => {
    if (!gameState || !isMyTurn || gameState.turnPhase !== 'action') return;
    // Gather cards from both hand and hold zone
    const cards = [...myHand, ...heldCards].filter(c => selectedCards.includes(c.id));
    if (!isValidMeld(cards)) {
      toast.error('Invalid meld! Need 3+ cards of same rank or consecutive same suit.');
      return;
    }

    const newHand = myHand.filter(c => !selectedCards.includes(c.id));
    // Also remove melded cards from hold zone
    setHeldCards(prev => prev.filter(c => !selectedCards.includes(c.id)));
    const newMeld = { id: crypto.randomUUID(), cards, owner: playerIndex };
    const newPlayers = [...gameState.players];
    newPlayers[playerIndex] = {
      ...newPlayers[playerIndex],
      hand: newHand,
      melds: [...newPlayers[playerIndex].melds, newMeld],
    };

    // Check for Tong Its (empty hand)
    if (newHand.length === 0) {
      playWin();
      updateGame({
        ...gameState,
        players: newPlayers,
        phase: 'finished',
        winner: playerIndex,
        winMethod: `Tong Its! ${me?.name} wins by using all cards!`,
        lastAction: `${me?.name} called Tong Its!`,
      });
    } else {
      playMeld();
      updateGame({
        ...gameState,
        players: newPlayers,
        lastAction: `${me?.name} melded ${cards.length} cards`,
      });
    }
    setSelectedCards([]);
    setHeldCards([]);
  }, [gameState, isMyTurn, myHand, heldCards, selectedCards, playerIndex, updateGame, me]);

  const layOffCard = useCallback((meldId: string) => {
    if (!gameState || !isMyTurn || gameState.turnPhase !== 'action') return;
    if (selectedCards.length === 0) {
      toast.error('Select card(s) to sapaw');
      return;
    }

    const cards = myHand.filter(c => selectedCards.includes(c.id));
    if (cards.length === 0) return;

    // Find meld across all players
    let targetMeld: any = null;
    let targetPlayerIdx = -1;
    for (let i = 0; i < gameState.players.length; i++) {
      const found = gameState.players[i].melds.find(m => m.id === meldId);
      if (found) {
        targetMeld = found;
        targetPlayerIdx = i;
        break;
      }
    }

    if (!targetMeld || !canLayOffMultiple(cards, targetMeld)) {
      toast.error('Cannot sapaw these cards on that meld');
      return;
    }

    const newHand = myHand.filter(c => !selectedCards.includes(c.id));
    const newPlayers = [...gameState.players];
    newPlayers[playerIndex] = { ...newPlayers[playerIndex], hand: newHand };
    newPlayers[targetPlayerIdx] = {
      ...newPlayers[targetPlayerIdx],
      melds: newPlayers[targetPlayerIdx].melds.map(m =>
        m.id === meldId ? { ...m, cards: [...m.cards, ...cards] } : m
      ),
    };

    playMeld();

    if (newHand.length === 0) {
      playWin();
      updateGame({
        ...gameState,
        players: newPlayers,
        phase: 'finished',
        winner: playerIndex,
        winMethod: `Tong Its! ${me?.name} wins by sapaw!`,
      });
    } else {
      updateGame({
        ...gameState,
        players: newPlayers,
        lastAction: `${me?.name} sapaw'd ${cards.length} card(s)`,
      });
    }
    setSelectedCards([]);
  }, [gameState, isMyTurn, myHand, selectedCards, playerIndex, updateGame, me]);

  // Check if a specific card can sapaw onto any meld, returns matching meld IDs
  const getMatchingSapawMelds = useCallback((cardId: string): string[] => {
    if (!gameState) return [];
    const card = myHand.find(c => c.id === cardId);
    if (!card) return [];
    const allMelds = gameState.players.flatMap(p => p.melds);
    return allMelds.filter(meld => canLayOff(card, meld)).map(m => m.id);
  }, [gameState, myHand]);

  // Get highlighted meld IDs based on currently selected card(s)
  const highlightedMeldIds = selectedCards.length === 1
    ? getMatchingSapawMelds(selectedCards[0])
    : [];

  const canSelectedCardSapaw = selectedCards.length === 1 && highlightedMeldIds.length > 0;

  const discardCard = useCallback(() => {
    if (!gameState || !isMyTurn || gameState.turnPhase !== 'action') return;
    if (selectedCards.length !== 1) {
      toast.error('Select exactly 1 card to discard');
      return;
    }

    // Prevent discard if the selected card can be sapaw'd
    if (canSelectedCardSapaw) {
      toast.error('This card can be sapaw\'d! Choose a different card or sapaw it first.');
      return;
    }

    const card = myHand.find(c => c.id === selectedCards[0]);
    if (!card) return;

    const newHand = myHand.filter(c => c.id !== card.id);
    const newPlayers = [...gameState.players];
    newPlayers[playerIndex] = { ...newPlayers[playerIndex], hand: newHand };
    const nextTurn = opponentIndex;

    playCardDiscard();
    setDiscardAnim(card.id);
    setTimeout(() => {
      setDiscardAnim(null);

      // Check if hand is empty after discard = Tong Its win!
      if (newHand.length === 0) {
        playWin();
        updateGame({
          ...gameState,
          discardPile: [...gameState.discardPile, card],
          players: newPlayers,
          phase: 'finished',
          winner: playerIndex,
          winMethod: `Tong Its! ${me?.name} emptied their hand!`,
          lastAction: `${me?.name} called Tong Its!`,
        });
      } else {
        updateGame({
          ...gameState,
          discardPile: [...gameState.discardPile, card],
          players: newPlayers,
          currentTurn: nextTurn,
          turnPhase: 'draw',
          lastAction: `${me?.name} discarded ${card.rank}${getSuitSymbol(card.suit)}`,
        });
      }
      setSelectedCards([]);
    }, 300);
  }, [gameState, isMyTurn, myHand, selectedCards, playerIndex, opponentIndex, updateGame, me, canSelectedCardSapaw]);

  const callDraw = useCallback(() => {
    if (!gameState || !isMyTurn) return;
    // Fight is only available BEFORE drawing (during draw phase)
    if (gameState.turnPhase !== 'draw') {
      toast.error('You can only call Fight before drawing a card!');
      return;
    }
    // Can only call draw if you have melds (exposed)
    if (me!.melds.length === 0) {
      toast.error('You need at least one meld to call a draw!');
      return;
    }

    playFight();
    updateGame({
      ...gameState,
      fightChallenger: playerIndex,
      lastAction: `${me?.name} is challenging to a Fight! ⚔️`,
    });
  }, [gameState, isMyTurn, myHand, playerIndex, updateGame, me]);

  const acceptFight = useCallback(() => {
    if (!gameState || gameState.fightChallenger === null || gameState.fightChallenger === undefined) return;
    const challengerIdx = gameState.fightChallenger;
    const challengerPoints = calculateHandPoints(gameState.players[challengerIdx].hand);
    const defenderIdx = challengerIdx === 0 ? 1 : 0;
    const defenderPoints = calculateHandPoints(gameState.players[defenderIdx].hand);
    const winner = challengerPoints <= defenderPoints ? challengerIdx : defenderIdx;

    playFight();
    updateGame({
      ...gameState,
      phase: 'finished',
      winner,
      fightChallenger: null,
      winMethod: `Fight! ${gameState.players[winner].name} wins with ${Math.min(challengerPoints, defenderPoints)} vs ${Math.max(challengerPoints, defenderPoints)} points!`,
    });
  }, [gameState, updateGame]);

  const declineFight = useCallback(() => {
    if (!gameState || gameState.fightChallenger === null || gameState.fightChallenger === undefined) return;
    updateGame({
      ...gameState,
      fightChallenger: null,
      lastAction: `${gameState.players[playerIndex].name} declined the fight challenge`,
    });
  }, [gameState, playerIndex, updateGame]);

  const copyRoomCode = () => {
    const url = `${window.location.origin}/game/${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copied! Share it with your friend.');
    setTimeout(() => setCopied(false), 2000);
  };

  const requestRematch = async () => {
    if (!gameState || !roomId) return;
    
    // If opponent already requested, start the game
    if (gameState.rematchRequested !== null && gameState.rematchRequested !== undefined && gameState.rematchRequested !== playerIndex) {
      const newGame = initializeGame(
        gameState.players[0].playerId,
        gameState.players[1].playerId,
        gameState.players[0].name,
        gameState.players[1].name
      );
      // Preserve themes
      (newGame.players[0] as any).theme = (gameState.players[0] as any).theme;
      (newGame.players[1] as any).theme = (gameState.players[1] as any).theme;
      await updateGame(newGame);
      setSelectedCards([]);
      setHeldCards([]);
    } else {
      // Request rematch
      await updateGame({ ...gameState, rematchRequested: playerIndex });
      toast.success('Rematch requested! Waiting for opponent...');
    }
  };

  const handleCoinFlipComplete = useCallback(async () => {
    if (!gameState || !roomId) return;
    await updateGame({
      ...gameState,
      phase: 'playing',
      lastAction: `${gameState.players[gameState.firstPlayer ?? 0].name} goes first!`,
    });
  }, [gameState, roomId, updateGame]);

  const sendEmote = useCallback(async (emote: string) => {
    if (!gameState) return;
    // Update game state with emote
    const newState = {
      ...gameState,
      activeEmote: { emote, from: playerIndex },
    };
    await updateGame(newState as any);
    setActiveEmote({ emote, from: playerIndex });
    setTimeout(() => {
      setActiveEmote(null);
    }, 2500);
  }, [gameState, playerIndex, updateGame]);

  // Watch for incoming emotes from opponent
  useEffect(() => {
    if (!gameState) return;
    const emoteData = (gameState as any).activeEmote;
    if (emoteData && emoteData.from !== playerIndex) {
      setActiveEmote(emoteData);
      setTimeout(() => setActiveEmote(null), 2500);
    }
  }, [(gameState as any)?.activeEmote?.emote, (gameState as any)?.activeEmote?.from]);

  // Waiting for opponent
  if (waiting) {
    return (
      <div className="min-h-screen felt-texture flex items-center justify-center p-4 relative overflow-hidden">
        <FloatingDinos count={10} />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="text-center space-y-6 max-w-sm relative z-10"
        >
          <motion.h2
            className="text-3xl font-display text-primary gold-glow"
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🦕 Waiting for Dino Buddy
          </motion.h2>
          <p className="text-muted-foreground">Share this link with your dino friend:</p>
          <motion.div
            className="bg-card/80 rounded-xl p-4 border border-border relative overflow-hidden"
            animate={{ boxShadow: ['0 0 0 0 hsl(45 90% 50% / 0)', '0 0 20px 4px hsl(45 90% 50% / 0.15)', '0 0 0 0 hsl(45 90% 50% / 0)'] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles count={5} />
            <p className="text-2xl font-mono font-bold tracking-[0.3em] text-primary mb-3">{roomCode}</p>
            <Button onClick={copyRoomCode} variant="outline" className="border-primary text-primary">
              <Copy className="w-4 h-4 mr-2" />
              {copied ? 'Copied!' : 'Copy Invite Link'}
            </Button>
          </motion.div>
          <motion.div
            className="flex justify-center gap-4"
          >
            {['🦖', '🦕', '🌋'].map((emoji, i) => (
              <motion.span
                key={i}
                className="text-2xl"
                animate={{ y: [0, -12, 0], rotate: [0, 10, -10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
              >
                {emoji}
              </motion.span>
            ))}
          </motion.div>
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="border-destructive/50 text-destructive hover:bg-destructive/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </motion.div>
      </div>
    );
  }

  if (!gameState || playerIndex < 0) {
    return (
      <div className="min-h-screen felt-texture flex items-center justify-center relative overflow-hidden">
        <FloatingDinos count={8} />
        <div className="text-center space-y-6 z-10">
          {/* Walking dino animation */}
          <motion.div
            className="relative mx-auto"
            style={{ width: 120, height: 100 }}
          >
            {/* Ground line */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-[2px] rounded-full bg-primary/30" />
            {/* Footprints trailing behind */}
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute bottom-1 text-xs"
                style={{ left: `${10 + i * 25}%` }}
                animate={{ opacity: [0.5, 0.15, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
              >
                🦶
              </motion.div>
            ))}
            {/* Walking dino */}
            <motion.div
              className="absolute bottom-1"
              animate={{
                x: [-30, 30, -30],
                scaleX: [-1, -1, -1, 1, 1, 1],
              }}
              transition={{
                x: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
                scaleX: { duration: 3, repeat: Infinity, ease: 'linear' },
              }}
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 0.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <img src={myTheme.image} alt="Walking dino" className="w-14 h-14 object-contain drop-shadow-lg" />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Loading text */}
          <motion.div className="space-y-2">
            <motion.h2
              className="text-2xl font-display text-primary gold-glow"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Loading Dino World
            </motion.h2>
            <div className="flex items-center justify-center gap-1">
              {['🥚', '🦴', '🌿'].map((emoji, i) => (
                <motion.span
                  key={i}
                  className="text-lg"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                >
                  {emoji}
                </motion.span>
              ))}
            </div>
          </motion.div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{ background: `hsl(${myTheme.colors.primary})` }}
                animate={{ scale: [0.5, 1.2, 0.5], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Filter held cards from displayed hand
  const visibleHand = myHand.filter(c => !heldCards.some(h => h.id === c.id));
  const sortedHand = sortMode === 'rank' ? sortByRank(visibleHand) : sortMode === 'group' ? sortByGroups(visibleHand) : sortHand(visibleHand);
  const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];

  

  return (
    <div className="min-h-screen felt-texture flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Leave
        </Button>
        <div className="text-xs text-muted-foreground font-mono">{roomCode}</div>
        <div className="text-xs text-muted-foreground">
          Deck: {gameState.deck.length}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main game area */}
        <div className="flex-1 flex flex-col overflow-hidden">

      {/* Opponent area */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-sm font-semibold flex items-center gap-1",
            gameState.currentTurn === opponentIndex ? "text-foreground" : "text-muted-foreground"
          )}>
            <img src={opponentTheme.image} alt={opponentTheme.name} className="w-5 h-5 object-contain" />
            {opponent?.name || 'Opponent'}
          </span>
          {gameState.currentTurn === opponentIndex && (
            <span
              className="text-xs px-2 py-0.5 rounded-full text-white"
              style={{ background: `hsl(${opponentTheme.colors.primary} / 0.6)` }}
            >Their turn</span>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {opponent?.hand.length || 0} cards
          </span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {opponent?.hand.map((_, i) => <CardBack key={i} index={i} theme={opponentTheme} />)}
        </div>
        {(opponent?.melds || []).length > 0 && (
          <div className="px-3 pb-1">
            <MeldDisplay melds={opponent?.melds || []} label={`${opponent?.name}'s melds`} onLayOff={layOffCard} canLayOff={isMyTurn && gameState.turnPhase === 'action' && selectedCards.length >= 1} highlightedMeldIds={highlightedMeldIds} />
          </div>
        )}
      </div>

      {/* Center - deck & discard */}
      <div className="flex-1 flex items-center justify-center gap-6 p-4 relative">
        {/* Deck */}
        <div className="text-center space-y-1">
          <motion.div
            onClick={isMyTurn && gameState.turnPhase === 'draw' ? drawFromDeck : undefined}
            animate={drawAnim === 'deck' ? { scale: [1, 0.9, 1], rotate: [0, -3, 0] } : {}}
            transition={{ duration: 0.3 }}
            whileTap={isMyTurn && gameState.turnPhase === 'draw' ? { scale: 0.92 } : {}}
            className={cn(
              "w-[52px] h-[74px] rounded-lg card-shadow flex items-center justify-center relative",
              isMyTurn && gameState.turnPhase === 'draw' && "cursor-pointer animate-pulse-gold"
            )}
            style={{
              background: `linear-gradient(135deg, hsl(${myTheme.colors.cardBack}), hsl(${myTheme.colors.cardBackEnd}))`,
              border: `2px solid hsl(${myTheme.colors.border})`,
            }}
          >
            <img src={myTheme.image} alt={myTheme.name} className="w-6 h-6 object-contain opacity-70" />
          </motion.div>
          <span className="text-[10px] text-muted-foreground">Deck ({gameState.deck.length})</span>
        </div>

        {/* Draw animation card flying to hand */}
        <AnimatePresence>
          {drawAnim && (
            <motion.div
              initial={{ opacity: 1, y: 0, x: drawAnim === 'deck' ? -40 : 40, scale: 1 }}
              animate={{ opacity: 0, y: 120, x: 0, scale: 0.6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeIn' }}
              className="absolute z-10 w-[52px] h-[74px] rounded-lg card-shadow flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, hsl(${myTheme.colors.cardBack}), hsl(${myTheme.colors.cardBackEnd}))`,
                border: `2px solid hsl(${myTheme.colors.border})`,
              }}
            >
              <img src={myTheme.image} alt={myTheme.name} className="w-5 h-5 object-contain opacity-50" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Discard pile */}
        <div className="text-center space-y-1">
          <motion.div
            onClick={isMyTurn && gameState.turnPhase === 'draw' && topDiscard && canPickDiscard() ? drawFromDiscard : isMyTurn && gameState.turnPhase === 'draw' && topDiscard ? () => toast.error('No matching cards in your hand for this discard!') : undefined}
            animate={drawAnim === 'discard' ? { scale: [1, 0.9, 1] } : {}}
            transition={{ duration: 0.3 }}
            className={cn(
              "w-[52px] h-[74px] rounded-lg border-2 border-dashed border-border flex items-center justify-center",
              topDiscard && "border-solid",
              isMyTurn && gameState.turnPhase === 'draw' && topDiscard && canPickDiscard() && "cursor-pointer hover:border-primary",
              isMyTurn && gameState.turnPhase === 'draw' && topDiscard && !canPickDiscard() && "cursor-not-allowed opacity-60"
            )}
          >
            <AnimatePresence mode="popLayout">
              {topDiscard ? (
                <motion.div
                  key={topDiscard.id}
                  initial={{ scale: 0.5, opacity: 0, rotateY: 90 }}
                  animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <PlayingCard card={topDiscard} />
                </motion.div>
              ) : (
                <span className="text-[10px] text-muted-foreground">Empty</span>
              )}
            </AnimatePresence>
          </motion.div>
          <span className="text-[10px] text-muted-foreground">Discard ({gameState.discardPile.length})</span>
        </div>

        {/* Game info */}
        {gameState.lastAction && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-[240px] text-xs text-muted-foreground bg-card/60 px-3 py-1 rounded-full">
            {gameState.lastAction}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {isMyTurn && gameState.turnPhase === 'action' && (
        <div className="flex gap-2 px-3 py-2 justify-center flex-wrap">
          {(() => {
            const meldCandidates = [...myHand, ...heldCards].filter(c => selectedCards.includes(c.id));
            const canMeld = meldCandidates.length >= 3 && isValidMeld(meldCandidates);
            return (
              <Button
                size="sm"
                onClick={meldCards}
                disabled={!canMeld}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Meld ({meldCandidates.length})
              </Button>
            );
          })()}
          <Button
            size="sm"
            onClick={holdCards}
            disabled={selectedCards.length === 0 || selectedCards.every(id => heldCards.some(h => h.id === id))}
            variant="outline"
            className="border-accent text-accent"
          >
            📌 Hold ({selectedCards.length})
          </Button>
          <Button
            size="sm"
            onClick={discardCard}
            disabled={selectedCards.length !== 1}
            variant="outline"
            className="border-primary text-primary"
          >
            Discard
          </Button>
        </div>
      )}

      {isMyTurn && gameState.turnPhase === 'draw' && (
        <div className="text-center py-2 space-y-2">
          <p className="text-sm text-primary animate-pulse">
            Draw a card from the deck or discard pile
          </p>
          <Button
            size="sm"
            onClick={callDraw}
            disabled={me!.melds.length === 0}
            variant="outline"
            className="border-accent text-accent font-bold"
          >
            ⚔️ Fight
          </Button>
        </div>
      )}

      {!isMyTurn && gameState.phase === 'playing' && gameState.fightChallenger === undefined || gameState.fightChallenger === null ? (
        !isMyTurn && gameState.phase === 'playing' && (
          <div className="text-center py-2 text-sm text-muted-foreground">
            Waiting for {opponent?.name}'s move...
          </div>
        )
      ) : null}

      {/* Fight challenge notification for opponent */}
      {gameState.phase === 'playing' && gameState.fightChallenger !== null && gameState.fightChallenger !== undefined && gameState.fightChallenger !== playerIndex && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-3 my-2 p-4 rounded-xl border-2 border-accent bg-card/90 text-center space-y-3"
        >
          <p className="text-lg font-display text-accent">⚔️ {opponent?.name} challenges you to a Fight!</p>
          <p className="text-xs text-muted-foreground">If you accept, the player with fewer points wins.</p>
          <div className="flex gap-3 justify-center">
            <Button size="sm" onClick={acceptFight} className="bg-accent text-accent-foreground font-bold">
              Accept Fight
            </Button>
            <Button size="sm" variant="outline" onClick={declineFight}>
              Decline
            </Button>
          </div>
        </motion.div>
      )}

      {/* Waiting for fight response */}
      {gameState.phase === 'playing' && gameState.fightChallenger === playerIndex && (
        <div className="text-center py-2 text-sm text-accent animate-pulse">
          ⚔️ Waiting for {opponent?.name} to respond to your fight challenge...
        </div>
      )}

      {/* My hand */}
      <div className="p-3 pb-4 space-y-2 border-t border-border/50">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-sm font-semibold flex items-center gap-1",
            isMyTurn ? "text-foreground" : "text-muted-foreground"
          )}>
            <img src={myTheme.image} alt={myTheme.name} className="w-5 h-5 object-contain" />
            {me?.name} (You)
          </span>
          <EmotePicker onSendEmote={sendEmote} />
          <div className="flex gap-1 ml-auto mr-2">
            <Button
              size="sm"
              variant={sortMode === 'suit' ? 'default' : 'ghost'}
              className="h-6 px-2 text-[10px]"
              onClick={() => setSortMode('suit')}
            >
              Suit
            </Button>
            <Button
              size="sm"
              variant={sortMode === 'rank' ? 'default' : 'ghost'}
              className="h-6 px-2 text-[10px]"
              onClick={() => setSortMode('rank')}
            >
              Rank
            </Button>
            <Button
              size="sm"
              variant={sortMode === 'group' ? 'default' : 'ghost'}
              className="h-6 px-2 text-[10px]"
              onClick={() => setSortMode('group')}
            >
              Group
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">
            Pts: {calculateHandPoints(myHand)}
          </span>
        </div>
        <div className="flex gap-1 flex-wrap justify-center items-end">
          {/* Main hand cards */}
          <AnimatePresence>
            {sortedHand.map((card, i) => (
              <motion.div
                key={card.id}
                layout
                initial={{ y: 30, opacity: 0, scale: 0.8 }}
                animate={
                  discardAnim === card.id
                    ? { y: -120, x: 0, opacity: 0, scale: 0.7, rotate: -10 }
                    : { y: 0, opacity: 1, scale: 1, rotate: 0 }
                }
                exit={{ y: -80, opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.3, delay: discardAnim ? 0 : i * 0.02 }}
              >
                <PlayingCard
                  card={card}
                  index={0}
                  selected={selectedCards.includes(card.id)}
                  onClick={() => toggleCardSelection(card.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Held cards - separated with a divider */}
          {heldCards.length > 0 && (
            <>
              <div className="flex flex-col items-center mx-2 self-stretch justify-center">
                <div className="w-px h-full bg-accent/50 min-h-[40px]" />
                <span className="text-[8px] text-accent font-bold my-0.5">HOLD</span>
                <div className="w-px h-full bg-accent/50 min-h-[40px]" />
              </div>
              <AnimatePresence>
          {heldCards.map((card, i) => {
                  const allHeldSelected = heldCards.every(c => selectedCards.includes(c.id));
                  return (
                    <motion.div
                      key={card.id}
                      layout
                      initial={{ x: -20, opacity: 0, scale: 0.8 }}
                      animate={{ x: 0, opacity: 1, scale: 1 }}
                      exit={{ x: 20, opacity: 0, scale: 0.6 }}
                      transition={{ duration: 0.25, delay: i * 0.02 }}
                    >
                      <PlayingCard
                        card={card}
                        index={0}
                        selected={selectedCards.includes(card.id)}
                        onClick={() => {
                          playClick();
                          if (allHeldSelected) {
                            // Deselect all held cards and return them
                            returnHeldCards(heldCards.map(c => c.id));
                          } else {
                            // Select all held cards as a group
                            setSelectedCards(prev => {
                              const nonHeldSelected = prev.filter(id => !heldCards.some(c => c.id === id));
                              return [...nonHeldSelected, ...heldCards.map(c => c.id)];
                            });
                          }
                        }}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </>
          )}
        </div>
        {(me?.melds || []).length > 0 && (
          <div className="px-3 pb-2">
            <MeldDisplay melds={me?.melds || []} label="Your melds" onLayOff={layOffCard} canLayOff={isMyTurn && gameState.turnPhase === 'action' && selectedCards.length >= 1} highlightedMeldIds={highlightedMeldIds} />
          </div>
        )}
      </div>

      {/* Emote bubble */}
      <AnimatePresence>
        {activeEmote && (
          <EmoteBubble
            emote={activeEmote.emote}
            isOpponent={activeEmote.from !== playerIndex}
          />
        )}
      </AnimatePresence>

      {/* Coin flip overlay */}
      {gameState.phase === 'coin_flip' && gameState.firstPlayer !== undefined && (
        <CoinFlip
          player0Name={gameState.players[0].name}
          player1Name={gameState.players[1].name}
          player0Theme={(gameState.players[0] as any).theme || 'rex'}
          player1Theme={(gameState.players[1] as any).theme || 'bronto'}
          winnerIndex={gameState.firstPlayer!}
          onComplete={handleCoinFlipComplete}
        />
      )}

      {/* Opponent disconnected overlay */}
      <AnimatePresence>
        {opponentDisconnected && gameState.phase === 'playing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-8 text-center space-y-4 max-w-sm w-full"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-5xl"
              >
                🦕
              </motion.div>
              <h2 className="text-2xl font-display text-primary">Opponent Disconnected</h2>
              <p className="text-sm text-muted-foreground">
                {opponent?.name} left the game. Waiting for them to reconnect...
              </p>
              <div className="text-3xl font-mono font-bold text-accent">{disconnectTimer}s</div>
              <p className="text-xs text-muted-foreground">
                You'll win automatically if they don't return in time.
              </p>
              <Button variant="outline" onClick={() => navigate('/')} className="border-primary text-primary">
                <ArrowLeft className="w-4 h-4 mr-2" /> Leave Game
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game over overlay */}
      <AnimatePresence>
        {gameState.phase === 'finished' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="bg-card border border-border rounded-2xl p-8 text-center space-y-4 max-w-sm w-full relative overflow-hidden"
            >
              <Sparkles color={gameState.winner === playerIndex ? myTheme.colors.primary : '0 0% 50%'} count={12} />
              {gameState.winner === playerIndex ? (
                <motion.div className="relative mx-auto w-32 h-32">
                  <img
                    src={dinoDance}
                    alt="Dancing dino"
                    className="w-32 h-32 object-contain"
                  />
                  {/* Confetti burst */}
                  {['🎉', '⭐', '🌟', '🎊', '💫', '✨'].map((emoji, i) => (
                    <motion.div
                      key={i}
                      className="absolute text-2xl"
                      style={{ left: '50%', top: '50%' }}
                      animate={{
                        x: [0, (Math.random() - 0.5) * 120],
                        y: [0, (Math.random() - 0.5) * 120],
                        opacity: [0, 1, 0],
                        scale: [0, 1.5, 0],
                        rotate: [0, 360],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.3,
                        ease: 'easeOut',
                      }}
                    >
                      {emoji}
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div className="relative mx-auto w-24 h-24">
                  <motion.img
                    src={myTheme.image}
                    alt={myTheme.name}
                    className="w-24 h-24 object-contain grayscale-[30%]"
                    animate={{
                      y: [0, 3, 0],
                      rotate: [0, -2, 2, -2, 0],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  {/* Sad rain */}
                  {Array.from({ length: 4 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute text-lg"
                      style={{ left: `${20 + i * 20}%`, top: '-10px' }}
                      animate={{ y: [0, 60], opacity: [0.8, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                    >
                      💧
                    </motion.div>
                  ))}
                </motion.div>
              )}
              <motion.h2
                className="text-3xl font-display gold-glow"
                style={{ color: gameState.winner === playerIndex ? `hsl(${myTheme.colors.primary})` : undefined }}
                animate={gameState.winner === playerIndex ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {gameState.winner === playerIndex ? 'You Win! RAWR!' : '🦴 You Lose...'}
              </motion.h2>
              <p className="text-sm text-muted-foreground">{gameState.winMethod}</p>
              <div className="flex flex-col gap-3 items-center pt-2">
                {gameState.rematchRequested === playerIndex ? (
                  <p className="text-sm text-muted-foreground animate-pulse">Waiting for opponent to accept...</p>
                ) : gameState.rematchRequested !== null && gameState.rematchRequested !== undefined ? (
                  <Button onClick={requestRematch} className="bg-primary text-primary-foreground">
                    <img src={myTheme.image} alt="" className="w-5 h-5 object-contain mr-1" />
                    Accept Rematch!
                  </Button>
                ) : (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button onClick={requestRematch} className="bg-primary text-primary-foreground">
                      <img src={myTheme.image} alt="" className="w-5 h-5 object-contain mr-1" />
                      Play Again
                    </Button>
                  </motion.div>
                )}
                <Button variant="outline" onClick={() => navigate('/')}>
                  Leave
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      </div>{/* end main game area */}
      </div>{/* end flex row */}
    </div>
  );
}
