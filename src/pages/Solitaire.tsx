import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { getSavedTheme, getThemeById } from '@/lib/dinoThemes';
import { FloatingDinos, Sparkles } from '@/components/game/FloatingDinos';
import {
  SolitaireState,
  initializeSolitaire,
  getSuitSymbol,
  getSuitColor,
  SUITS,
  SolitaireCard,
  canMoveToFoundation,
  canMoveToTableau,
  getRankValue
} from '@/lib/solitaire';
import { PlayingCard, CardBack } from '@/components/game/PlayingCard';
import { toast } from 'sonner';

const Solitaire = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<SolitaireState | null>(null);
  const [draggedCard, setDraggedCard] = useState<SolitaireCard | null>(null);
  const [draggedFrom, setDraggedFrom] = useState<{ type: 'tableau' | 'waste'; index: number } | null>(null);
  const [dragOverZone, setDragOverZone] = useState<{ type: 'foundation' | 'tableau'; index: number } | null>(null);
  const theme = getThemeById(getSavedTheme());

  const startGame = () => {
    setGameState(initializeSolitaire());
  };

  const resetGame = () => {
    setGameState(null);
  };

  const drawFromStock = () => {
    if (!gameState) return;

    setGameState(prev => {
      if (!prev) return prev;

      if (prev.stock.length === 0) {
        // Reset stock from waste
        return {
          ...prev,
          stock: [...prev.waste].reverse(),
          waste: [],
          moves: prev.moves + 1
        };
      }

      const newStock = [...prev.stock];
      const drawnCard = newStock.pop()!;
      drawnCard.faceUp = true;

      return {
        ...prev,
        stock: newStock,
        waste: [...prev.waste, drawnCard],
        moves: prev.moves + 1
      };
    });
  };

  const moveCardToFoundation = (card: SolitaireCard, foundationIndex: number) => {
    if (!gameState) return;

    const foundation = gameState.foundations[foundationIndex];
    if (!canMoveToFoundation(card, foundation)) {
      toast.error("Can't move that card there!");
      return;
    }

    setGameState(prev => {
      if (!prev) return prev;

      const newState = { ...prev };
      newState.moves += 1;
      newState.score += 10;

      // Remove from source
      if (draggedFrom?.type === 'waste') {
        newState.waste = newState.waste.slice(0, -1);
      } else if (draggedFrom?.type === 'tableau') {
        const pile = newState.tableau[draggedFrom.index];
        pile.pop();
        // Flip the next card if it's face down
        if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
          pile[pile.length - 1].faceUp = true;
        }
      }

      // Add to foundation
      newState.foundations[foundationIndex].push(card);

      // Check win condition
      const totalCards = newState.foundations.reduce((sum, f) => sum + f.length, 0);
      if (totalCards === 52) {
        newState.gameWon = true;
        newState.score += 100;
      }

      return newState;
    });

    setDraggedCard(null);
    setDraggedFrom(null);
  };

  const moveCardToTableau = (card: SolitaireCard, tableauIndex: number) => {
    if (!gameState) return;

    const tableauPile = gameState.tableau[tableauIndex];
    if (!canMoveToTableau(card, tableauPile)) {
      toast.error("Can't move that card there!");
      return;
    }

    setGameState(prev => {
      if (!prev) return prev;

      const newState = { ...prev };
      newState.moves += 1;
      newState.score += 5;

      // Remove from source
      if (draggedFrom?.type === 'waste') {
        newState.waste = newState.waste.slice(0, -1);
      } else if (draggedFrom?.type === 'tableau') {
        const sourcePile = newState.tableau[draggedFrom.index];
        sourcePile.pop();
        // Flip the next card if it's face down
        if (sourcePile.length > 0 && !sourcePile[sourcePile.length - 1].faceUp) {
          sourcePile[sourcePile.length - 1].faceUp = true;
        }
      }

      // Add to tableau
      newState.tableau[tableauIndex].push(card);

      return newState;
    });

    setDraggedCard(null);
    setDraggedFrom(null);
  };

  const handleDragStart = (card: SolitaireCard, from: { type: 'tableau' | 'waste'; index: number }) => {
    if (!card.faceUp) return;
    setDraggedCard(card);
    setDraggedFrom(from);
  };

  const handleDragEnd = () => {
    setDraggedCard(null);
    setDraggedFrom(null);
    setDragOverZone(null);
  };

  const handleDrop = (dropZone: { type: 'foundation' | 'tableau'; index: number }) => {
    if (!draggedCard || !draggedFrom) return;

    if (dropZone.type === 'foundation') {
      moveCardToFoundation(draggedCard, dropZone.index);
    } else {
      moveCardToTableau(draggedCard, dropZone.index);
    }
    setDragOverZone(null);
  };

  const handleDragOver = (dropZone: { type: 'foundation' | 'tableau'; index: number }) => {
    setDragOverZone(dropZone);
  };

  const handleDragLeave = () => {
    setDragOverZone(null);
  };

  const getHint = () => {
    if (!gameState) return;

    // Check for cards that can be moved to foundations
    for (let pileIndex = 0; pileIndex < gameState.tableau.length; pileIndex++) {
      const pile = gameState.tableau[pileIndex];
      if (pile.length > 0) {
        const card = pile[pile.length - 1];
        if (card.faceUp) {
          for (let fIndex = 0; fIndex < 4; fIndex++) {
            if (canMoveToFoundation(card, gameState.foundations[fIndex])) {
              toast.success(`Try moving the ${card.rank} of ${card.suit} to the foundation!`);
              return;
            }
          }
        }
      }
    }

    // Check waste pile
    if (gameState.waste.length > 0) {
      const card = gameState.waste[gameState.waste.length - 1];
      for (let fIndex = 0; fIndex < 4; fIndex++) {
        if (canMoveToFoundation(card, gameState.foundations[fIndex])) {
          toast.success(`Try moving the ${card.rank} of ${card.suit} from waste to foundation!`);
          return;
        }
      }
    }

    toast.info("No obvious moves right now. Try drawing a card or rearranging the tableau.");
  };

  return (
    <div className="min-h-screen felt-texture p-4">
      <FloatingDinos />
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Lobby
          </Button>
          {gameState && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetGame}
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              New Game
            </Button>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-8"
        >
          <div className="relative">
            <Sparkles color={theme.colors.primary} count={8} />
            <h1
              className="text-4xl font-display gold-glow mb-4"
              style={{ color: `hsl(${theme.colors.primary})` }}
            >
              Dino Solitaire
            </h1>
            <p className="text-lg text-muted-foreground">
              Challenge yourself with this prehistoric card game!
            </p>
          </div>

          {!gameState ? (
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="space-y-6"
            >
              <Button
                onClick={startGame}
                size="lg"
                className="text-xl px-8 py-4"
                style={{
                  background: `hsl(${theme.colors.primary})`,
                  color: 'white'
                }}
              >
                Start Game
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {/* Game Stats */}
              <div className="flex justify-center gap-8 text-sm items-center">
                <div>Score: <span className="font-bold">{gameState.score}</span></div>
                <div>Moves: <span className="font-bold">{gameState.moves}</span></div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={getHint}
                  className="text-xs"
                >
                  Hint
                </Button>
              </div>

              {/* Instructions */}
              <div className="text-center text-sm text-muted-foreground max-w-2xl mx-auto">
                <p>Click the stock to draw cards. Drag cards to move them. Click cards to auto-move to foundations if possible.</p>
                <p>Build foundations up by suit from Ace to King. Build tableau down by alternating colors.</p>
              </div>

              {/* Game Board */}
              <div className="space-y-4">
                {/* Top Row: Stock, Waste, Foundations */}
                <div className="flex justify-center gap-4">
                  {/* Stock */}
                  <div
                    className="w-16 h-24 bg-secondary/20 rounded-lg border-2 border-dashed border-border/50 flex items-center justify-center cursor-pointer hover:bg-secondary/30 transition-colors"
                    onClick={drawFromStock}
                  >
                    {gameState.stock.length > 0 ? (
                      <CardBack className="w-full h-full" />
                    ) : (
                      <span className="text-xs text-muted-foreground">Empty</span>
                    )}
                  </div>

                  {/* Waste */}
                  <div className="w-16 h-24">
                    {gameState.waste.length > 0 ? (
                      <div
                        draggable
                        onDragStart={() => handleDragStart(gameState.waste[gameState.waste.length - 1], { type: 'waste', index: 0 })}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleCardClick(gameState.waste[gameState.waste.length - 1], { type: 'waste', index: 0 })}
                        className="cursor-pointer"
                      >
                        <PlayingCard
                          card={gameState.waste[gameState.waste.length - 1]}
                          className="w-full h-full"
                          faceDown={false}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full bg-secondary/20 rounded-lg border-2 border-dashed border-border/50 flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">Waste</span>
                      </div>
                    )}
                  </div>

                  {/* Spacer */}
                  <div className="w-8" />

                  {/* Foundations */}
                  {gameState.foundations.map((foundation, index) => (
                    <div
                      key={index}
                      className={`w-16 h-24 transition-all ${
                        dragOverZone?.type === 'foundation' && dragOverZone.index === index
                          ? 'ring-2 ring-primary scale-105'
                          : ''
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        handleDragOver({ type: 'foundation', index });
                      }}
                      onDragLeave={handleDragLeave}
                      onDrop={() => handleDrop({ type: 'foundation', index })}
                    >
                      {foundation.length > 0 ? (
                        <PlayingCard
                          card={foundation[foundation.length - 1]}
                          className="w-full h-full"
                          faceDown={false}
                        />
                      ) : (
                        <div className="w-full h-full bg-secondary/20 rounded-lg border-2 border-dashed border-border/50 flex items-center justify-center hover:bg-secondary/30 transition-colors">
                          <span className="text-xs text-muted-foreground">
                            {getSuitSymbol(SUITS[index])}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Tableau */}
                <div className="flex justify-center gap-2">
                  {gameState.tableau.map((pile, pileIndex) => (
                    <div
                      key={pileIndex}
                      className={`flex flex-col gap-1 transition-all ${
                        dragOverZone?.type === 'tableau' && dragOverZone.index === pileIndex
                          ? 'ring-2 ring-primary scale-105'
                          : ''
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        handleDragOver({ type: 'tableau', index: pileIndex });
                      }}
                      onDragLeave={handleDragLeave}
                      onDrop={() => handleDrop({ type: 'tableau', index: pileIndex })}
                    >
                      {pile.map((card, cardIndex) => (
                        <div
                          key={`${pileIndex}-${cardIndex}`}
                          draggable={card.faceUp}
                          onDragStart={() => handleDragStart(card, { type: 'tableau', index: pileIndex })}
                          onDragEnd={handleDragEnd}
                          onClick={() => handleCardClick(card, { type: 'tableau', index: pileIndex })}
                          className={card.faceUp ? "cursor-pointer" : "cursor-default"}
                          style={{
                            marginTop: cardIndex > 0 ? '-3.5rem' : '0',
                            zIndex: cardIndex
                          }}
                        >
                          <PlayingCard
                            card={card}
                            className="w-16 h-24"
                            faceDown={!card.faceUp}
                          />
                        </div>
                      ))}
                      {pile.length === 0 && (
                        <div className="w-16 h-24 bg-secondary/20 rounded-lg border-2 border-dashed border-border/50 flex items-center justify-center hover:bg-secondary/30 transition-colors">
                          <span className="text-xs text-muted-foreground">Empty</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {gameState.gameWon && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-center space-y-4"
                >
                  <h2 className="text-2xl font-bold text-green-500">Congratulations! 🦖</h2>
                  <p>You won in {gameState.moves} moves with a score of {gameState.score}!</p>
                  <Button onClick={resetGame}>Play Again</Button>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Solitaire;