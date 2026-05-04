// Klondike Solitaire Game Logic

import { Card, Suit, Rank } from './tongits';

export interface SolitaireCard extends Card {
  faceUp: boolean;
}

export interface SolitaireState {
  stock: SolitaireCard[];
  waste: SolitaireCard[];
  foundations: SolitaireCard[][]; // 4 piles, one per suit
  tableau: SolitaireCard[][]; // 7 piles
  score: number;
  moves: number;
  gameWon: boolean;
}

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function createDeck(): SolitaireCard[] {
  const deck: SolitaireCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        suit,
        rank,
        id: `${suit}-${rank}`,
        faceUp: false
      });
    }
  }
  return shuffle(deck);
}

export function shuffle(deck: SolitaireCard[]): SolitaireCard[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function initializeSolitaire(): SolitaireState {
  const deck = createDeck();

  const tableau: SolitaireCard[][] = [[], [], [], [], [], [], []];
  let deckIndex = 0;

  // Deal tableau
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const card = deck[deckIndex++];
      if (row === col) card.faceUp = true;
      tableau[col].push(card);
    }
  }

  const stock = deck.slice(deckIndex);

  return {
    stock,
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    score: 0,
    moves: 0,
    gameWon: false,
  };
}

export function canMoveToFoundation(card: SolitaireCard, foundation: SolitaireCard[]): boolean {
  if (foundation.length === 0) {
    return card.rank === 'A'; // Ace
  }
  const topCard = foundation[foundation.length - 1];
  return card.suit === topCard.suit && getRankValue(card.rank) === getRankValue(topCard.rank) + 1;
}

export function canMoveToTableau(card: SolitaireCard, tableauPile: SolitaireCard[]): boolean {
  if (tableauPile.length === 0) {
    return card.rank === 'K'; // King
  }
  const topCard = tableauPile[tableauPile.length - 1];
  return isOppositeColor(card.suit, topCard.suit) && getRankValue(card.rank) === getRankValue(topCard.rank) - 1;
}

export function isOppositeColor(suit1: Suit, suit2: Suit): boolean {
  const reds: Suit[] = ['hearts', 'diamonds'];
  const blacks: Suit[] = ['clubs', 'spades'];
  return (reds.includes(suit1) && blacks.includes(suit2)) ||
         (blacks.includes(suit1) && reds.includes(suit2));
}

export function getRankValue(rank: Rank): number {
  const values: Record<Rank, number> = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
  };
  return values[rank];
}

export function getSuitSymbol(suit: Suit): string {
  switch (suit) {
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
    case 'spades': return '♠';
    default: return '';
  }
}

export function getSuitColor(suit: Suit): string {
  return ['hearts', 'diamonds'].includes(suit) ? 'text-red-500' : 'text-black';
}