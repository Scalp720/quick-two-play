// Dino Theme System - Each dino has a unique colorful identity

import dinoRex from '@/assets/dino-rex.png';
import dinoBronto from '@/assets/dino-bronto.png';
import dinoStego from '@/assets/dino-stego.png';

export interface DinoTheme {
  id: string;
  name: string;
  emoji: string;
  image: string;
  description: string;
  colors: {
    primary: string;
    primaryGlow: string;
    cardBack: string;
    cardBackEnd: string;
    accent: string;
    border: string;
  };
}

export const DINO_THEMES: DinoTheme[] = [
  {
    id: 'rex',
    name: 'T-Rex',
    emoji: '🦖',
    image: dinoRex,
    description: 'Fierce & dominant',
    colors: {
      primary: '35 85% 50%',
      primaryGlow: '45 90% 55%',
      cardBack: '35 60% 35%',
      cardBackEnd: '25 45% 20%',
      accent: '45 90% 55%',
      border: '35 45% 30%',
    },
  },
  {
    id: 'bronto',
    name: 'Bronto',
    emoji: '🦕',
    image: dinoBronto,
    description: 'Gentle giant',
    colors: {
      primary: '160 40% 42%',
      primaryGlow: '150 50% 48%',
      cardBack: '160 35% 30%',
      cardBackEnd: '170 30% 18%',
      accent: '140 45% 42%',
      border: '160 30% 25%',
    },
  },
  {
    id: 'stego',
    name: 'Stego',
    emoji: '🦕',
    image: dinoStego,
    description: 'Armored warrior',
    colors: {
      primary: '80 40% 40%',
      primaryGlow: '70 50% 45%',
      cardBack: '80 35% 28%',
      cardBackEnd: '90 28% 18%',
      accent: '60 50% 42%',
      border: '80 30% 24%',
    },
  },
];

export function getThemeById(id: string): DinoTheme {
  return DINO_THEMES.find(t => t.id === id) || DINO_THEMES[0];
}

export function getSavedTheme(): string {
  return localStorage.getItem('dino_theme') || 'rex';
}

export function saveTheme(id: string) {
  localStorage.setItem('dino_theme', id);
}
