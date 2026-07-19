import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, isToday, isYesterday, isThisYear } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatChatTime(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Yesterday';
  if (isThisYear(d)) return format(d, 'd MMM');
  return format(d, 'dd/MM/yyyy');
}

export function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  return format(d, 'HH:mm');
}

export function formatDateDivider(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  if (isThisYear(d)) return format(d, 'd MMMM');
  return format(d, 'd MMMM yyyy');
}

export function formatLastSeen(iso: string | null): string {
  if (!iso) return 'offline';
  const d = new Date(iso);
  if (isToday(d)) return `last seen today at ${format(d, 'HH:mm')}`;
  if (isYesterday(d)) return `last seen yesterday at ${format(d, 'HH:mm')}`;
  return `last seen ${format(d, 'dd/MM/yyyy')}`;
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getDisplayName(p: { display_name?: string; username?: string } | null | undefined): string {
  return p?.display_name || p?.username || 'Unknown';
}

/** Deterministic gradient avatar color pair from an id string */
const AVATAR_GRADIENTS: [string, string][] = [
  ['#008069', '#00a884'],
  ['#0d6efd', '#5ea6ff'],
  ['#d97706', '#fbbf24'],
  ['#dc2626', '#f87171'],
  ['#7c3aed', '#a78bfa'],
  ['#0891b2', '#22d3ee'],
  ['#db2777', '#f472b6'],
  ['#059669', '#34d399'],
  ['#ea580c', '#fb923c'],
  ['#4f46e5', '#818cf8'],
];
export function avatarGradient(id: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

export function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export function isImageType(type: MessageType): boolean {
  return type === 'image';
}
export function isVideoType(type: MessageType): boolean {
  return type === 'video';
}
export function isAudioType(type: MessageType): boolean {
  return type === 'audio';
}
export function isFileType(type: MessageType): boolean {
  return type === 'file';
}

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file';

export function chatTitle(chat: { chat_type: string; name: string | null; peer?: { display_name: string; username: string } | null }): string {
  if (chat.chat_type === 'group') return chat.name || 'Group';
  return chat.peer?.display_name || chat.peer?.username || 'Direct chat';
}

/** returns "You, John, Mary, +2 others" */
export function joinNames(names: string[], max = 3): string {
  if (names.length === 0) return '';
  if (names.length <= max) {
    const me = names.map((n) => (n.toLowerCase() === 'you' ? 'You' : n));
    return me.join(', ');
  }
  return `${names.slice(0, max).join(', ')}, +${names.length - max} more`;
}
