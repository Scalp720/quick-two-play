// Tong Its Game Logic

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string;
}

export interface Meld {
  id: string;
  cards: Card[];
  owner: number; // player index
}

export interface ChatMessage {
  id: string;
  playerIndex: number;
  playerName: string;
  text: string;
  timestamp: number;
}

export interface GameState {
  deck: Card[];
  discardPile: Card[];
  players: {
    hand: Card[];
    melds: Meld[];
    playerId: string;
    name: string;
    holdGroups?: Card[][];
  }[];
  currentTurn: number;
  phase: 'waiting' | 'coin_flip' | 'playing' | 'finished';
  turnPhase: 'draw' | 'action' | 'discard';
  winner: number | null;
  winMethod: string | null;
  lastAction: string | null;
  rematchRequested?: number | null;
  fightChallenger?: number | null;
  firstPlayer?: number;
  chatMessages?: ChatMessage[];
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${rank}_${suit}` });
    }
  }
  return shuffleDeck(deck);
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealCards(deck: Card[], numPlayers: number, cardsPerPlayer: number = 12): { hands: Card[][]; remaining: Card[] } {
  const hands: Card[][] = Array.from({ length: numPlayers }, () => []);
  const remaining = [...deck];
  
  // First player gets 13 cards (dealer), rest get 12
  for (let i = 0; i < cardsPerPlayer; i++) {
    for (let p = 0; p < numPlayers; p++) {
      if (remaining.length > 0) {
        hands[p].push(remaining.pop()!);
      }
    }
  }
  // First player (current turn) gets extra card
  if (remaining.length > 0) {
    hands[0].push(remaining.pop()!);
  }
  
  return { hands, remaining };
}

export function getCardValue(card: Card): number {
  if (card.rank === 'A') return 1;
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  return parseInt(card.rank);
}

export function getRankIndex(rank: Rank): number {
  return RANKS.indexOf(rank);
}

export function calculateHandPoints(hand: Card[]): number {
  return hand.reduce((sum, card) => sum + getCardValue(card), 0);
}

export function isValidSet(cards: Card[]): boolean {
  if (cards.length < 3 || cards.length > 4) return false;
  const rank = cards[0].rank;
  const suits = new Set(cards.map(c => c.suit));
  return cards.every(c => c.rank === rank) && suits.size === cards.length;
}

export function isValidRun(cards: Card[]): boolean {
  if (cards.length < 3) return false;
  const suit = cards[0].suit;
  if (!cards.every(c => c.suit === suit)) return false;
  
  const indices = cards.map(c => getRankIndex(c.rank)).sort((a, b) => a - b);
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1] + 1) return false;
  }
  return true;
}

export function isValidMeld(cards: Card[]): boolean {
  return isValidSet(cards) || isValidRun(cards);
}

export function canLayOff(card: Card, meld: Meld): boolean {
  const testCards = [...meld.cards, card];
  return isValidSet(testCards) || isValidRun(testCards);
}

export function canLayOffMultiple(cards: Card[], meld: Meld): boolean {
  const testCards = [...meld.cards, ...cards];
  return isValidSet(testCards) || isValidRun(testCards);
}

export function getSuitSymbol(suit: Suit): string {
  const symbols: Record<Suit, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };
  return symbols[suit];
}

export function getSuitColor(suit: Suit): 'red' | 'black' {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}

export function initializeGame(player1Id: string, player2Id: string, player1Name: string, player2Name: string): GameState {
  const firstPlayer = Math.random() < 0.5 ? 0 : 1;
  const deck = createDeck();
  // Deal: the first player gets 13 cards (extra card), second gets 12
  const hands: Card[][] = [[], []];
  const remaining = [...deck];
  
  // Deal 12 cards each
  for (let i = 0; i < 12; i++) {
    for (let p = 0; p < 2; p++) {
      const dealIdx = p === 0 ? firstPlayer : (1 - firstPlayer);
      if (remaining.length > 0) hands[dealIdx].push(remaining.pop()!);
    }
  }
  // First player gets extra (13th) card
  if (remaining.length > 0) hands[firstPlayer].push(remaining.pop()!);

  return {
    deck: remaining,
    discardPile: [],
    players: [
      { hand: hands[0], melds: [], playerId: player1Id, name: player1Name },
      { hand: hands[1], melds: [], playerId: player2Id, name: player2Name },
    ],
    currentTurn: firstPlayer,
    phase: 'coin_flip',
    turnPhase: 'action',
    winner: null,
    winMethod: null,
    lastAction: null,
    firstPlayer,
  };
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function generatePlayerId(): string {
  return crypto.randomUUID();
}

export function sortHand(hand: Card[]): Card[] {
  return [...hand].sort((a, b) => {
    const suitOrder = SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
    if (suitOrder !== 0) return suitOrder;
    return getRankIndex(a.rank) - getRankIndex(b.rank);
  });
}

export function sortByRank(hand: Card[]): Card[] {
  return [...hand].sort((a, b) => {
    const rankDiff = getRankIndex(a.rank) - getRankIndex(b.rank);
    if (rankDiff !== 0) return rankDiff;
    return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
  });
}

export function sortByGroups(hand: Card[]): Card[] {
  // Group cards that form potential melds (same rank groups, then consecutive suit runs)
  const sorted: Card[] = [];
  const used = new Set<string>();

  // First: find same-rank groups (pairs/sets)
  const byRank = new Map<Rank, Card[]>();
  for (const card of hand) {
    if (!byRank.has(card.rank)) byRank.set(card.rank, []);
    byRank.get(card.rank)!.push(card);
  }
  for (const [, cards] of byRank) {
    if (cards.length >= 2) {
      for (const c of cards) { sorted.push(c); used.add(c.id); }
    }
  }

  // Then: find consecutive suit runs among remaining
  const remaining = hand.filter(c => !used.has(c.id));
  const bySuit = new Map<Suit, Card[]>();
  for (const card of remaining) {
    if (!bySuit.has(card.suit)) bySuit.set(card.suit, []);
    bySuit.get(card.suit)!.push(card);
  }
  for (const [, cards] of bySuit) {
    cards.sort((a, b) => getRankIndex(a.rank) - getRankIndex(b.rank));
    // Find consecutive sequences
    let run: Card[] = [cards[0]];
    for (let i = 1; i < cards.length; i++) {
      if (getRankIndex(cards[i].rank) === getRankIndex(cards[i-1].rank) + 1) {
        run.push(cards[i]);
      } else {
        if (run.length >= 2) {
          for (const c of run) { sorted.push(c); used.add(c.id); }
        }
        run = [cards[i]];
      }
    }
    if (run.length >= 2) {
      for (const c of run) { sorted.push(c); used.add(c.id); }
    }
  }

  // Append remaining ungrouped cards
  for (const card of hand) {
    if (!used.has(card.id)) sorted.push(card);
  }
  return sorted;
}
