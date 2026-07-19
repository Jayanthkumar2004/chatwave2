import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Smile } from 'lucide-react';
import { cn } from '@/lib/utils';

const EMOJIS = [
  '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩',
  '😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐',
  '🤨','😐','😑','😶','😏','😒','🙄','😬','😌','😔','😪','🤤','😴','😷','🤒','🤕',
  '🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','😮','😯',
  '😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩',
  '😫','🥱','😤','😡','😠','🤬','😈','👿','💀','💩','🤡',' 👻','👽','🤖',' ❤️','🧡',
  '💛','💚','💙','💜','🖤','🤍','💔','❣️','💕','💞','💓','💗','💖','💘','💝','🎉',
  '🎊','🎁','🎂','🎈','👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇',
  '🔥','⭐','🌟','✨','⚡','💯','🙏','💪','👏','🙌','👋','🤝','✅','❌','❓','❗',
];

interface EmojiPickerProps {
  onPick: (emoji: string) => void;
  className?: string;
}

export function EmojiPicker({ onPick, className }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label="Pick emoji"
      >
        <Smile className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute bottom-12 left-0 z-50 w-72 rounded-xl border bg-popover p-2 shadow-xl animate-fade-in">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-medium text-muted-foreground">Emojis</span>
            <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
          </div>
          <div className="grid max-h-60 grid-cols-8 gap-1 overflow-y-auto scrollbar-thin">
            {EMOJIS.map((e, i) => (
              <button
                key={`${e}-${i}`}
                onClick={() => {
                  onPick(e);
                  setOpen(false);
                }}
                className="flex h-8 w-8 items-center justify-center rounded text-lg transition-transform hover:scale-125 hover:bg-accent"
                type="button"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Used by createPortal if needed elsewhere */
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}
