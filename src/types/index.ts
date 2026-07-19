export type ChatType = 'private' | 'group';
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file';
export type MemberRole = 'owner' | 'admin' | 'member';
export type NotificationType = 'message' | 'contact' | 'group' | 'system';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  last_seen: string | null;
  is_online: boolean;
  created_at: string;
}

export interface Chat {
  id: string;
  chat_type: ChatType;
  name: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMember {
  id: string;
  chat_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  message: string;
  message_type: MessageType;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  reply_to: string | null;
  edited: boolean;
  deleted: boolean;
  deleted_for: string[];
  read_by: string[];
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  owner_id: string;
  contact_user_id: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}

/** Enriched chat for the sidebar: chat + peer profile (private) + member list + last message */
export interface ChatWithDetails extends Chat {
  members?: Profile[];
  peer?: Profile;
  last_message?: Message | null;
  unread_count?: number;
}

export interface MessageWithSender extends Message {
  sender?: Profile;
  reply?: Message | null;
}

export interface ContactWithProfile extends Contact {
  profile?: Profile;
}
