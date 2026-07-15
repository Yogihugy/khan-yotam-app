import { getSupabase } from './supabase';

export function threadIdFor(userA: string, userB: string): string {
  return [userA, userB].sort().join(':');
}

export type ChatMessage = {
  id: string;
  thread_id: string;
  from_user_id: string;
  to_user_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

export type ConversationPreview = {
  peerId: string;
  peerName: string;
  peerColor: string;
  lastMessage: string;
  lastAt: string;
  threadId: string;
};

export async function fetchMessages(threadId: string): Promise<ChatMessage[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('messages')
    .select('id, thread_id, from_user_id, to_user_id, content, created_at, read_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) throw error;
  return (data || []) as ChatMessage[];
}

export async function sendMessage(input: {
  fromUserId: string;
  toUserId: string;
  content: string;
}): Promise<ChatMessage> {
  const supabase = getSupabase();
  const thread_id = threadIdFor(input.fromUserId, input.toUserId);
  const { data, error } = await supabase
    .from('messages')
    .insert({
      thread_id,
      from_user_id: input.fromUserId,
      to_user_id: input.toUserId,
      content: input.content.trim(),
    })
    .select('id, thread_id, from_user_id, to_user_id, content, created_at, read_at')
    .single();

  if (error) throw error;
  return data as ChatMessage;
}

export async function markThreadRead(threadId: string, selfId: string) {
  const supabase = getSupabase();
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('thread_id', threadId)
    .eq('to_user_id', selfId)
    .is('read_at', null);
}

export async function fetchConversationPreviews(
  selfId: string,
): Promise<ConversationPreview[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('messages')
    .select('id, thread_id, from_user_id, to_user_id, content, created_at')
    .or(`from_user_id.eq.${selfId},to_user_id.eq.${selfId}`)
    .order('created_at', { ascending: false })
    .limit(300);

  if (error) throw error;

  const rows = (data || []) as ChatMessage[];
  const byThread = new Map<string, ChatMessage>();
  for (const row of rows) {
    if (!byThread.has(row.thread_id)) byThread.set(row.thread_id, row);
  }

  const peerIds = [...byThread.values()].map((m) =>
    m.from_user_id === selfId ? m.to_user_id : m.from_user_id,
  );

  const uniquePeers = [...new Set(peerIds)];
  const nameById = new Map<string, { name: string; color: string }>();

  if (uniquePeers.length > 0) {
    // Peer names via active map RPC + self-known threads (phone hidden)
    const { data: active } = await supabase.rpc('get_active_map_users');
    for (const u of active || []) {
      nameById.set(u.id, { name: u.name, color: u.color });
    }

    // Fallback labels for peers not currently active on map
    for (const id of uniquePeers) {
      if (!nameById.has(id)) nameById.set(id, { name: 'משתמש/ת', color: '#7f8c8d' });
    }
  }

  return [...byThread.values()].map((m) => {
    const peerId = m.from_user_id === selfId ? m.to_user_id : m.from_user_id;
    const peer = nameById.get(peerId) || { name: 'משתמש/ת', color: '#7f8c8d' };
    return {
      peerId,
      peerName: peer.name,
      peerColor: peer.color,
      lastMessage: m.content,
      lastAt: m.created_at,
      threadId: m.thread_id,
    };
  });
}

export async function fetchChatPeer(peerId: string): Promise<{
  id: string;
  name: string;
  color: string;
  traveler_type: string | null;
} | null> {
  const supabase = getSupabase();
  const { data: active } = await supabase.rpc('get_active_map_users');
  const found = (active || []).find((u: { id: string }) => u.id === peerId);
  if (found) {
    return {
      id: found.id,
      name: found.name,
      color: found.color,
      traveler_type: found.traveler_type,
    };
  }
  return { id: peerId, name: 'משתמש/ת', color: '#7f8c8d', traveler_type: null };
}
