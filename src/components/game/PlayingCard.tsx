import { Card as CardType, getSuitSymbol, getSuitColor } from '@/lib/tongits';
import { DinoTheme } from '@/lib/dinoThemes';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PlayingCardProps {
  card: CardType;
  selected?: boolean;
  onClick?: () => void;
  faceDown?: boolean;
  index?: number;
  small?: boolean;
  theme?: DinoTheme;
}

export function PlayingCard({ card, selected, onClick, faceDown, index = 0, small, theme }: PlayingCardProps) {
  const color = getSuitColor(card.suit);
  const symbol = getSuitSymbol(card.suit);
  const isRed = color === 'red';

  if (faceDown && theme) {
    return (
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
        className="w-[52px] h-[74px] rounded-lg card-shadow flex items-center justify-center cursor-default"
        style={{
          background: `linear-gradient(135deg, hsl(${theme.colors.cardBack}), hsl(${theme.colors.cardBackEnd}))`,
          border: `2px solid hsl(${theme.colors.border})`,
        }}
      >
        <img src={theme.image} alt={theme.name} className="w-7 h-7 object-contain opacity-70" />
      </motion.div>
    );
  }

  if (faceDown) {
    return (
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
        className="playing-card-back flex items-center justify-center cursor-default"
      >
        <div className="text-gold-dim text-lg font-bold opacity-40">🦕</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: selected ? -12 : 0, opacity: 1 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      whileHover={{ y: -8 }}
      onClick={onClick}
      className={cn(
        "playing-card card-hover cursor-pointer select-none flex flex-col justify-between p-1 relative overflow-hidden",
        small && "!w-[40px] !h-[56px] !text-[9px] !p-0.5",
        selected && "ring-2 ring-primary"
      )}
    >
      <div className={cn("flex flex-col items-start leading-none", isRed ? "text-card-red" : "text-card-black")}>
        <span className="font-bold text-[11px] leading-none">{card.rank}</span>
        <span className="text-[9px] leading-none">{symbol}</span>
      </div>
      <div className={cn("text-lg text-center leading-none", small && "!text-sm", isRed ? "text-card-red" : "text-card-black")}>
        {symbol}
      </div>
      <div className={cn("flex flex-col items-end leading-none rotate-180", isRed ? "text-card-red" : "text-card-black")}>
        <span className="font-bold text-[11px] leading-none">{card.rank}</span>
        <span className="text-[9px] leading-none">{symbol}</span>
      </div>
    </motion.div>
  );
}

export function CardBack({ index = 0, theme }: { index?: number; theme?: DinoTheme }) {
  if (theme) {
    return (
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: index * 0.02 }}
        className="w-[52px] h-[74px] rounded-lg card-shadow flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, hsl(${theme.colors.cardBack}), hsl(${theme.colors.cardBackEnd}))`,
          border: `2px solid hsl(${theme.colors.border})`,
        }}
      >
        <img src={theme.image} alt={theme.name} className="w-6 h-6 object-contain opacity-50" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      transition={{ delay: index * 0.02 }}
      className="playing-card-back flex items-center justify-center"
    >
      <div className="text-gold-dim opacity-30 text-sm">🦖</div>
    </motion.div>
  );
}
