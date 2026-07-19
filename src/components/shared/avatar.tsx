import { cn, avatarGradient, initials } from '@/lib/utils';
import { OnlineDot } from './online-dot';

interface AvatarProps {
  name: string;
  src?: string | null;
  id?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  showStatus?: boolean;
  className?: string;
}

const SIZES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-24 w-24 text-2xl',
};

const DOT_SIZE: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'h-2 w-2',
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
  lg: 'h-3.5 w-3.5',
  xl: 'h-5 w-5',
};

export function Avatar({ name, src, id = name, size = 'md', isOnline, showStatus, className }: AvatarProps) {
  const [from, to] = avatarGradient(id);
  return (
    <div className={cn('relative shrink-0', className)}>
      <div
        className={cn(
          'relative flex items-center justify-center overflow-hidden rounded-full font-semibold text-white shadow-sm',
          SIZES[size]
        )}
        style={{ backgroundImage: src ? undefined : `linear-gradient(135deg, ${from}, ${to})` }}
      >
        {src ? (
          <img src={src} alt={name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span>{initials(name)}</span>
        )}
      </div>
      {showStatus && <OnlineDot online={!!isOnline} className={cn('absolute bottom-0 right-0 border-2 border-background', DOT_SIZE[size])} />}
    </div>
  );
}
