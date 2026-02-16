// Dino Theme System - Each dino has a unique colorful identity

export interface DinoTheme {
  id: string;
  name: string;
  emoji: string;
  description: string;
  colors: {
    primary: string;      // HSL values (no hsl() wrapper)
    primaryGlow: string;
    cardBack: string;     // gradient start
    cardBackEnd: string;  // gradient end
    accent: string;
    border: string;
  };
}

export const DINO_THEMES: DinoTheme[] = [
  {
    id: 'rex',
    name: 'T-Rex',
    emoji: '🦖',
    description: 'Fierce & fiery',
    colors: {
      primary: '0 80% 55%',
      primaryGlow: '15 90% 60%',
      cardBack: '0 70% 45%',
      cardBackEnd: '350 60% 30%',
      accent: '25 90% 55%',
      border: '0 60% 40%',
    },
  },
  {
    id: 'bronto',
    name: 'Bronto',
    emoji: '🦕',
    description: 'Cool & calm',
    colors: {
      primary: '210 75% 55%',
      primaryGlow: '195 85% 60%',
      cardBack: '210 65% 45%',
      cardBackEnd: '225 55% 30%',
      accent: '185 80% 50%',
      border: '210 50% 40%',
    },
  },
  {
    id: 'stego',
    name: 'Stego',
    emoji: '🐊',
    description: 'Pretty in pink',
    colors: {
      primary: '320 70% 60%',
      primaryGlow: '340 80% 65%',
      cardBack: '320 60% 50%',
      cardBackEnd: '300 50% 35%',
      accent: '350 75% 60%',
      border: '320 50% 45%',
    },
  },
  {
    id: 'raptor',
    name: 'Raptor',
    emoji: '🐉',
    description: 'Sneaky & electric',
    colors: {
      primary: '145 55% 45%',
      primaryGlow: '160 65% 50%',
      cardBack: '145 45% 35%',
      cardBackEnd: '160 35% 22%',
      accent: '80 70% 50%',
      border: '145 40% 35%',
    },
  },
  {
    id: 'ptero',
    name: 'Ptero',
    emoji: '🦅',
    description: 'Royal & majestic',
    colors: {
      primary: '270 65% 60%',
      primaryGlow: '285 75% 65%',
      cardBack: '270 55% 48%',
      cardBackEnd: '255 45% 32%',
      accent: '45 85% 55%',
      border: '270 45% 42%',
    },
  },
  {
    id: 'trice',
    name: 'Trice',
    emoji: '🐂',
    description: 'Bold & sunny',
    colors: {
      primary: '40 85% 55%',
      primaryGlow: '50 90% 60%',
      cardBack: '35 75% 45%',
      cardBackEnd: '25 65% 30%',
      accent: '20 90% 55%',
      border: '40 60% 40%',
    },
  },
];

export function getThemeById(id: string): DinoTheme {
  return DINO_THEMES.find(t => t.id === id) || DINO_THEMES[3]; // default raptor (green, original)
}

export function getSavedTheme(): string {
  return localStorage.getItem('dino_theme') || 'raptor';
}

export function saveTheme(id: string) {
  localStorage.setItem('dino_theme', id);
}
