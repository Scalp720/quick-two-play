import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  GameState, Card, initializeGame, generatePlayerId, isValidMeld,
  canLayOff, calculateHandPoints, sortHand, sortByRank, sortByGroups, getSuitSymbol, getSuitColor,
} from '@/lib/tongits';
import { PlayingCard, CardBack } from '@/components/game/PlayingCard';
import { MeldDisplay } from '@/components/game/MeldDisplay';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Copy, ArrowLeft } from 'lucide-react';
import { playCardDraw, playCardDiscard, playMeld, playWin, playLose, playClick, playFight } from '@/lib/sounds';
import { getThemeById, getSavedTheme } from '@/lib/dinoThemes';

export default function GamePage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerIndex, setPlayerIndex] = useState<number>(-1);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [waiting, setWaiting] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sortMode, setSortMode] = useState<'suit' | 'rank' | 'group'>('suit');
  const [drawAnim, setDrawAnim] = useState<'deck' | 'discard' | null>(null);
  const [discardAnim, setDiscardAnim] = useState<string | null>(null);
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

      // Subscribe to changes
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

      return () => {
        supabase.removeChannel(channel);
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

  const drawFromDiscard = useCallback(() => {
    if (!gameState || !isMyTurn || gameState.turnPhase !== 'draw') return;
    if (gameState.discardPile.length === 0) return;

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

  const meldCards = useCallback(() => {
    if (!gameState || !isMyTurn || gameState.turnPhase !== 'action') return;
    const cards = myHand.filter(c => selectedCards.includes(c.id));
    if (!isValidMeld(cards)) {
      toast.error('Invalid meld! Need 3+ cards of same rank or consecutive same suit.');
      return;
    }

    const newHand = myHand.filter(c => !selectedCards.includes(c.id));
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
  }, [gameState, isMyTurn, myHand, selectedCards, playerIndex, updateGame, me]);

  const layOffCard = useCallback((meldId: string) => {
    if (!gameState || !isMyTurn || gameState.turnPhase !== 'action') return;
    if (selectedCards.length !== 1) {
      toast.error('Select exactly 1 card to lay off');
      return;
    }

    const card = myHand.find(c => c.id === selectedCards[0]);
    if (!card) return;

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

    if (!targetMeld || !canLayOff(card, targetMeld)) {
      toast.error('Cannot lay off this card on that meld');
      return;
    }

    const newHand = myHand.filter(c => c.id !== card.id);
    const newPlayers = [...gameState.players];
    newPlayers[playerIndex] = { ...newPlayers[playerIndex], hand: newHand };
    newPlayers[targetPlayerIdx] = {
      ...newPlayers[targetPlayerIdx],
      melds: newPlayers[targetPlayerIdx].melds.map(m =>
        m.id === meldId ? { ...m, cards: [...m.cards, card] } : m
      ),
    };

    if (newHand.length === 0) {
      updateGame({
        ...gameState,
        players: newPlayers,
        phase: 'finished',
        winner: playerIndex,
        winMethod: `Tong Its! ${me?.name} wins!`,
      });
    } else {
      updateGame({
        ...gameState,
        players: newPlayers,
        lastAction: `${me?.name} laid off a card`,
      });
    }
    setSelectedCards([]);
  }, [gameState, isMyTurn, myHand, selectedCards, playerIndex, updateGame, me]);

  const discardCard = useCallback(() => {
    if (!gameState || !isMyTurn || gameState.turnPhase !== 'action') return;
    if (selectedCards.length !== 1) {
      toast.error('Select exactly 1 card to discard');
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
  }, [gameState, isMyTurn, myHand, selectedCards, playerIndex, opponentIndex, updateGame, me]);

  const callDraw = useCallback(() => {
    if (!gameState || !isMyTurn || gameState.turnPhase !== 'action') return;
    // Can only call draw if you have melds (exposed)
    if (me!.melds.length === 0) {
      toast.error('You need at least one meld to call a draw!');
      return;
    }

    const myPoints = calculateHandPoints(myHand);
    const opponentPoints = calculateHandPoints(opponent!.hand);
    const winner = myPoints <= opponentPoints ? playerIndex : opponentIndex;

    playFight();
    updateGame({
      ...gameState,
      phase: 'finished',
      winner,
      winMethod: `Fight! ${gameState.players[winner].name} wins with ${Math.min(myPoints, opponentPoints)} vs ${Math.max(myPoints, opponentPoints)} points!`,
    });
  }, [gameState, isMyTurn, myHand, playerIndex, opponentIndex, updateGame, me, opponent]);

  const copyRoomCode = () => {
    const url = `${window.location.origin}/game/${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copied! Share it with your friend.');
    setTimeout(() => setCopied(false), 2000);
  };

  const playAgain = async () => {
    if (!gameState || !roomId) return;
    const newGame = initializeGame(
      gameState.players[0].playerId,
      gameState.players[1].playerId,
      gameState.players[0].name,
      gameState.players[1].name
    );
    await updateGame(newGame);
    setSelectedCards([]);
  };

  // Waiting for opponent
  if (waiting) {
    return (
      <div className="min-h-screen felt-texture flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center space-y-6 max-w-sm"
        >
          <h2 className="text-3xl font-display text-primary gold-glow">🦕 Waiting for Dino Buddy</h2>
          <p className="text-muted-foreground">Share this link with your dino friend:</p>
          <div className="bg-card/80 rounded-xl p-4 border border-border">
            <p className="text-2xl font-mono font-bold tracking-[0.3em] text-primary mb-3">{roomCode}</p>
            <Button onClick={copyRoomCode} variant="outline" className="border-primary text-primary">
              <Copy className="w-4 h-4 mr-2" />
              {copied ? 'Copied!' : 'Copy Invite Link'}
            </Button>
          </div>
          <div className="animate-pulse-gold w-3 h-3 rounded-full bg-primary mx-auto" />
        </motion.div>
      </div>
    );
  }

  if (!gameState || playerIndex < 0) {
    return (
      <div className="min-h-screen felt-texture flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const sortedHand = sortMode === 'rank' ? sortByRank(myHand) : sortMode === 'group' ? sortByGroups(myHand) : sortHand(myHand);
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

      {/* Opponent area */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-sm font-semibold flex items-center gap-1",
            gameState.currentTurn === opponentIndex ? "text-foreground" : "text-muted-foreground"
          )}>
            <span>{opponentTheme.emoji}</span>
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
        <MeldDisplay melds={opponent?.melds || []} label="Opponent's melds" onLayOff={layOffCard} canLayOff={isMyTurn && gameState.turnPhase === 'action' && selectedCards.length === 1} />
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
            <span className="text-[10px] font-bold opacity-60">{myTheme.emoji}</span>
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
              <span className="opacity-40 text-sm">{myTheme.emoji}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Discard pile */}
        <div className="text-center space-y-1">
          <motion.div
            onClick={isMyTurn && gameState.turnPhase === 'draw' && topDiscard ? drawFromDiscard : undefined}
            animate={drawAnim === 'discard' ? { scale: [1, 0.9, 1] } : {}}
            transition={{ duration: 0.3 }}
            className={cn(
              "w-[52px] h-[74px] rounded-lg border-2 border-dashed border-border flex items-center justify-center",
              topDiscard && "border-solid",
              isMyTurn && gameState.turnPhase === 'draw' && topDiscard && "cursor-pointer hover:border-primary"
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

      {/* My melds */}
      <div className="px-3">
        <MeldDisplay melds={me?.melds || []} label="Your melds" onLayOff={layOffCard} canLayOff={isMyTurn && gameState.turnPhase === 'action' && selectedCards.length === 1} />
      </div>

      {/* Action buttons */}
      {isMyTurn && gameState.turnPhase === 'action' && (
        <div className="flex gap-2 px-3 py-2 justify-center flex-wrap">
          <Button
            size="sm"
            onClick={meldCards}
            disabled={selectedCards.length < 3}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Meld ({selectedCards.length})
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
          <Button
            size="sm"
            onClick={callDraw}
            variant="outline"
            className="border-accent text-accent font-bold"
          >
            ⚔️ Fight
          </Button>
        </div>
      )}

      {isMyTurn && gameState.turnPhase === 'draw' && (
        <div className="text-center py-2 text-sm text-primary animate-pulse">
          Draw a card from the deck or discard pile
        </div>
      )}

      {!isMyTurn && gameState.phase === 'playing' && (
        <div className="text-center py-2 text-sm text-muted-foreground">
          Waiting for {opponent?.name}'s move...
        </div>
      )}

      {/* My hand */}
      <div className="p-3 pb-4 space-y-2 border-t border-border/50">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-sm font-semibold flex items-center gap-1",
            isMyTurn ? "text-foreground" : "text-muted-foreground"
          )}>
            <span>{myTheme.emoji}</span>
            {me?.name} (You)
          </span>
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
        <div className="flex gap-1 flex-wrap justify-center">
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
        </div>
      </div>

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
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-8 text-center space-y-4 max-w-sm w-full"
            >
              <h2
                className="text-3xl font-display gold-glow"
                style={{ color: gameState.winner === playerIndex ? `hsl(${myTheme.colors.primary})` : undefined }}
              >
                {gameState.winner === playerIndex ? `${myTheme.emoji} You Win! RAWR!` : '🦴 You Lose...'}
              </h2>
              <p className="text-sm text-muted-foreground">{gameState.winMethod}</p>
              <div className="flex gap-3 justify-center pt-2">
                <Button onClick={playAgain} className="bg-primary text-primary-foreground">
                  Play Again
                </Button>
                <Button variant="outline" onClick={() => navigate('/')}>
                  Leave
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
