import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/tongits';

interface ChatOverlayProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  playerIndex: number;
}

export function ChatOverlay({ messages, onSend, playerIndex }: ChatOverlayProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [unread, setUnread] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(messages.length);

  // Track unread when closed
  useEffect(() => {
    if (!open && messages.length > prevCountRef.current) {
      setUnread(prev => prev + (messages.length - prevCountRef.current));
    }
    if (open) setUnread(0);
    prevCountRef.current = messages.length;
  }, [messages.length, open]);

  // Auto-scroll
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, open]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <>
      {/* Toggle button */}
      {!open && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-4 right-4 z-50 bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center shadow-lg"
          onClick={() => setOpen(true)}
        >
          <MessageCircle className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </motion.button>
      )}

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            drag
            dragConstraints={{ left: -300, right: 300, top: -500, bottom: 50 }}
            dragElastic={0.1}
            dragMomentum={false}
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-0 right-0 left-0 z-50 sm:left-auto sm:right-4 sm:bottom-4 sm:w-80"
          >
            <div className="bg-card border border-border rounded-t-xl sm:rounded-xl shadow-2xl flex flex-col max-h-[50vh]">
              {/* Header (Drag Handle) */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-border cursor-grab active:cursor-grabbing">
                <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4" /> Chat
                </span>
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-[120px]">
                {messages.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No messages yet. Say hi! 🦕</p>
                )}
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex flex-col max-w-[80%]",
                      msg.playerIndex === playerIndex ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <span className="text-[10px] text-muted-foreground">{msg.playerName}</span>
                    <div className={cn(
                      "rounded-lg px-2.5 py-1 text-xs",
                      msg.playerIndex === playerIndex
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="flex items-center gap-1.5 p-2 border-t border-border">
                <Input
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Type a message..."
                  className="text-xs h-8"
                  maxLength={200}
                />
                <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleSend} disabled={!text.trim()}>
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
