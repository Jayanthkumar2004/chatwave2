import { cn } from '@/lib/utils';

interface OnlineDotProps {
  online: boolean;
  className?: string;
}

export function OnlineDot({ online, className }: OnlineDotProps) {
  return (
    <span
      className={cn(
        'inline-block rounded-full',
        online ? 'bg-emerald-500' : 'bg-zinc-400',
        className
      )}
      aria-label={online ? 'online' : 'offline'}
    />
  );
}
