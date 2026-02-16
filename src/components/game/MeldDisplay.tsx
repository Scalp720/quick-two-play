import { Meld, getSuitSymbol, getSuitColor } from '@/lib/tongits';
import { cn } from '@/lib/utils';

interface MeldDisplayProps {
  melds: Meld[];
  label: string;
  onLayOff?: (meldId: string) => void;
  canLayOff?: boolean;
}

export function MeldDisplay({ melds, label, onLayOff, canLayOff }: MeldDisplayProps) {
  if (melds.length === 0) return null;

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="flex flex-wrap gap-3">
        {melds.map((meld) => (
          <div
            key={meld.id}
            onClick={() => canLayOff && onLayOff?.(meld.id)}
            className={cn(
              "flex gap-0.5 p-2 rounded-lg bg-secondary/50 border border-border",
              canLayOff && "cursor-pointer hover:border-primary transition-colors"
            )}
          >
            {meld.cards.map((card) => {
              const isRed = getSuitColor(card.suit) === 'red';
              return (
                <div
                  key={card.id}
                  className="w-[36px] h-[50px] rounded bg-card-white flex flex-col items-center justify-center text-xs card-shadow"
                >
                  <span className={cn("font-bold", isRed ? "text-card-red" : "text-card-black")}>
                    {card.rank}
                  </span>
                  <span className={cn(isRed ? "text-card-red" : "text-card-black")}>
                    {getSuitSymbol(card.suit)}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
