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
    image: dinoBronto,
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
    emoji: '🦕',
    image: dinoStego,
    description: 'Tough & bold',
    colors: {
      primary: '320 70% 60%',
      primaryGlow: '340 80% 65%',
      cardBack: '320 60% 50%',
      cardBackEnd: '300 50% 35%',
      accent: '350 75% 60%',
      border: '320 50% 45%',
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
