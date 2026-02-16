import { Card as CardType, getSuitSymbol, getSuitColor } from '@/lib/tongits';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PlayingCardProps {
  card: CardType;
  selected?: boolean;
  onClick?: () => void;
  faceDown?: boolean;
  index?: number;
  small?: boolean;
}

export function PlayingCard({ card, selected, onClick, faceDown, index = 0, small }: PlayingCardProps) {
  const color = getSuitColor(card.suit);
  const symbol = getSuitSymbol(card.suit);
  const isRed = color === 'red';

  if (faceDown) {
    return (
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
        className="playing-card-back flex items-center justify-center cursor-default"
      >
        <div className="text-gold-dim text-lg font-bold opacity-40">🂠</div>
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
        "playing-card card-hover cursor-pointer select-none flex flex-col justify-between p-1.5 relative",
        small && "!w-[48px] !h-[68px] !text-xs !p-1",
        selected && "ring-2 ring-primary"
      )}
    >
      <div className={cn("flex flex-col items-start leading-none", isRed ? "text-card-red" : "text-card-black")}>
        <span className="font-bold">{card.rank}</span>
        <span className="text-xs">{symbol}</span>
      </div>
      <div className={cn("text-2xl text-center", small && "!text-lg", isRed ? "text-card-red" : "text-card-black")}>
        {symbol}
      </div>
      <div className={cn("flex flex-col items-end leading-none rotate-180", isRed ? "text-card-red" : "text-card-black")}>
        <span className="font-bold">{card.rank}</span>
        <span className="text-xs">{symbol}</span>
      </div>
    </motion.div>
  );
}

export function CardBack({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      transition={{ delay: index * 0.02 }}
      className="playing-card-back flex items-center justify-center"
    >
      <div className="text-gold-dim opacity-30 text-sm">✦</div>
    </motion.div>
  );
}
