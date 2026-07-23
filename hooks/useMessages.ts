import { supabase } from '@/constants/supabase';
import { useTranslation } from '@/context/LanguageContext';
import { useCallback, useEffect, useState } from 'react';

export type ChatMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: string;
  readAt: string | null;
};

type MessageRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  text: string;
  created_at: string;
  read_at: string | null;
};

function fromRow(r: MessageRow): ChatMessage {
  return {
    id: r.id,
    senderId: r.sender_id,
    recipientId: r.recipient_id,
    text: r.text,
    createdAt: r.created_at,
    readAt: r.read_at,
  };
}

export function useChatThread(friendId: string) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setMessages([]);
        return;
      }
      setMyId(user.id);
      const { data, error } = await supabase
        .from('messages')
        .select('id, sender_id, recipient_id, text, created_at, read_at')
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) {
        console.warn('[Chat] load failed:', error.message);
        setMessages([]);
        return;
      }
      setMessages(((data ?? []) as MessageRow[]).map(fromRow));
    } catch (e) {
      console.warn('[Chat] load failed:', e);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [friendId]);

  const markRead = useCallback(async () => {
    if (!supabase || !myId) return;
    try {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', friendId)
        .eq('recipient_id', myId)
        .is('read_at', null);
    } catch (e) {
      console.warn('[Chat] markRead failed:', e);
    }
  }, [friendId, myId]);

  const sendMessage = useCallback(
    async (text: string): Promise<{ ok: boolean; error?: string }> => {
      const trimmed = text.trim();
      if (!trimmed) return { ok: false, error: t('emptyMessageError') };
      if (!supabase) return { ok: false, error: t('serverConnectionError') };
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return { ok: false, error: t('mustSignInFirst') };
        const { data, error } = await supabase
          .from('messages')
          .insert({ sender_id: user.id, recipient_id: friendId, text: trimmed })
          .select('id, sender_id, recipient_id, text, created_at, read_at')
          .single();
        if (error) return { ok: false, error: error.message };
        setMessages((prev) => [...prev, fromRow(data as MessageRow)]);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : t('genericErrorOccurred') };
      }
    },
    [friendId, t]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const client = supabase;
    if (!client || !myId) return;
    const channel = client
      .channel(`chat:${myId}:${friendId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${friendId}` },
        (payload) => {
          const row = payload.new as MessageRow;
          if (row.recipient_id !== myId) return;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, fromRow(row)]));
        }
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [myId, friendId]);

  return { messages, loading, myId, sendMessage, markRead, reload: load };
}

export function useUnreadMessageCounts(friendIds: string[]) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const friendIdsKey = friendIds.join(',');

  const load = useCallback(async () => {
    if (!supabase || friendIds.length === 0) {
      setCounts({});
      return;
    }
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setCounts({});
        return;
      }
      const { data, error } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('recipient_id', user.id)
        .is('read_at', null)
        .in('sender_id', friendIds);
      if (error) {
        console.warn('[Chat] unread counts failed:', error.message);
        return;
      }
      const next: Record<string, number> = {};
      for (const row of (data ?? []) as { sender_id: string }[]) {
        next[row.sender_id] = (next[row.sender_id] ?? 0) + 1;
      }
      setCounts(next);
    } catch (e) {
      console.warn('[Chat] unread counts failed:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendIdsKey]);

  useEffect(() => {
    void load();
  }, [load]);

  return { unreadCounts: counts, reloadUnread: load };
}
