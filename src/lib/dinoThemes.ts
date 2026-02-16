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
    description: 'Fierce & fiery',
    colors: {
      primary: '30 75% 50%',
      primaryGlow: '40 85% 55%',
      cardBack: '30 60% 40%',
      cardBackEnd: '20 50% 25%',
      accent: '45 80% 55%',
      border: '30 50% 35%',
    },
  },
  {
    id: 'bronto',
    name: 'Bronto',
    emoji: '🦕',
    image: dinoBronto,
    description: 'Cool & calm',
    colors: {
      primary: '140 45% 45%',
      primaryGlow: '130 55% 50%',
      cardBack: '140 40% 35%',
      cardBackEnd: '150 35% 22%',
      accent: '120 50% 45%',
      border: '140 35% 30%',
    },
  },
  {
    id: 'stego',
    name: 'Stego',
    emoji: '🦕',
    image: dinoStego,
    description: 'Tough & bold',
    colors: {
      primary: '80 50% 42%',
      primaryGlow: '90 60% 48%',
      cardBack: '80 40% 32%',
      cardBackEnd: '70 35% 20%',
      accent: '60 55% 45%',
      border: '80 35% 28%',
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
