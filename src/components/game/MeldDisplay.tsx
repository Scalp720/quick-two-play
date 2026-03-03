import { Meld, getSuitSymbol, getSuitColor } from '@/lib/tongits';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface MeldDisplayProps {
  melds: Meld[];
  label: string;
  onLayOff?: (meldId: string) => void;
  canLayOff?: boolean;
  highlightedMeldIds?: string[];
}

export function MeldDisplay({ melds, label, onLayOff, canLayOff, highlightedMeldIds = [] }: MeldDisplayProps) {
  if (melds.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {label && <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>}
      <div className="flex flex-wrap gap-2">
        {melds.map((meld, meldIdx) => {
          const isHighlighted = highlightedMeldIds.includes(meld.id);
          return (
            <motion.div
              key={meld.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: meldIdx * 0.1, type: 'spring' }}
              onClick={() => canLayOff && onLayOff?.(meld.id)}
              className={cn(
                "flex gap-0.5 p-1.5 rounded-lg bg-secondary/50 border border-border transition-all duration-200",
                canLayOff && "cursor-pointer hover:border-primary hover:shadow-[0_0_12px_hsl(var(--primary)/0.2)]",
                isHighlighted && "border-primary ring-2 ring-primary/50 bg-primary/10 animate-pulse"
              )}
            >
              {meld.cards.map((card) => {
                const isRed = getSuitColor(card.suit) === 'red';
                return (
                  <div
                    key={card.id}
                    className="w-[28px] h-[40px] rounded bg-card-white flex flex-col items-center justify-center text-[8px] card-shadow"
                  >
                    <span className={cn("font-bold leading-none", isRed ? "text-card-red" : "text-card-black")}>
                      {card.rank}
                    </span>
                    <span className={cn("leading-none", isRed ? "text-card-red" : "text-card-black")}>
                      {getSuitSymbol(card.suit)}
                    </span>
                  </div>
                );
              })}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
