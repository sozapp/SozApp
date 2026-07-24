import { act } from 'react-test-renderer';
import {
  authState,
  flushAsync,
  mockSupabaseClient,
  renderHook,
  resetMockSupabase,
  tableData,
} from '@/hooks/testUtils';
import { useNotificationsCenter } from '@/hooks/useNotificationsCenter';

jest.mock('@/constants/supabase', () => ({
  supabase: mockSupabaseClient,
}));

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useFocusEffect: (cb: () => void | (() => void)) => {
      React.useEffect(() => {
        const cleanup = cb();
        return typeof cleanup === 'function' ? cleanup : undefined;
        // eslint-disable-next-line react-hooks/exhaustive-deps -- test: mount'ta bir kez yükle
      }, []);
    },
  };
});

jest.mock('expo-notifications', () => ({
  setBadgeCountAsync: jest.fn(async () => {}),
}));

jest.mock('@/context/LanguageContext', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: 'tr' as const,
    changeLanguage: jest.fn(),
  }),
}));

beforeEach(() => {
  resetMockSupabase();
});

describe('useNotificationsCenter', () => {
  it('pendingRequests + unreadThreads toplamını totalCount olarak yansıtır', async () => {
    authState.user = { id: 'me', email: 'me@example.com' };

    tableData.friendships = [
      {
        id: 'req-1',
        user_id: 'stranger-1',
        friend_id: 'me',
        status: 'pending',
      },
      {
        id: 'friendship-1',
        user_id: 'me',
        friend_id: 'friend-1',
        status: 'accepted',
      },
    ];
    tableData.profiles = [
      { id: 'stranger-1', display_name: 'Ayşe', email: 'ayse@example.com' },
      { id: 'friend-1', display_name: 'Ali', email: 'ali@example.com' },
    ];
    tableData.messages = [
      {
        id: 'm1',
        sender_id: 'friend-1',
        recipient_id: 'me',
        text: 'Merhaba',
        created_at: '2026-01-01T00:00:00.000Z',
        read_at: null,
      },
      {
        id: 'm2',
        sender_id: 'friend-1',
        recipient_id: 'me',
        text: 'Nasılsın?',
        created_at: '2026-01-01T00:01:00.000Z',
        read_at: null,
      },
    ];

    const { result } = renderHook(() => useNotificationsCenter());
    await flushAsync(6);

    expect(result.current.pendingRequests).toHaveLength(1);
    expect(result.current.pendingRequests[0]?.fromUserId).toBe('stranger-1');
    expect(result.current.unreadThreads).toHaveLength(1);
    expect(result.current.unreadThreads[0]?.friendId).toBe('friend-1');
    expect(result.current.unreadThreads[0]?.unreadCount).toBe(2);
    // 1 bekleyen istek + 2 okunmamış mesaj
    expect(result.current.totalCount).toBe(3);
  });

  it('acceptRequest sonrası ilgili istek pending listesinden düşer', async () => {
    authState.user = { id: 'me', email: 'me@example.com' };
    tableData.friendships = [
      {
        id: 'req-1',
        user_id: 'stranger-1',
        friend_id: 'me',
        status: 'pending',
      },
    ];
    tableData.profiles = [
      { id: 'stranger-1', display_name: 'Ayşe', email: 'ayse@example.com' },
    ];
    tableData.messages = [];

    const { result } = renderHook(() => useNotificationsCenter());
    await flushAsync(6);
    expect(result.current.pendingRequests).toHaveLength(1);

    let ok = false;
    await act(async () => {
      ok = await result.current.acceptRequest('req-1');
    });
    await flushAsync(6);

    expect(ok).toBe(true);
    expect(result.current.pendingRequests.find((r) => r.id === 'req-1')).toBeUndefined();
    expect(result.current.pendingRequests).toHaveLength(0);
  });

  it('rejectRequest sonrası ilgili istek pending listesinden düşer', async () => {
    authState.user = { id: 'me', email: 'me@example.com' };
    tableData.friendships = [
      {
        id: 'req-2',
        user_id: 'stranger-2',
        friend_id: 'me',
        status: 'pending',
      },
    ];
    tableData.profiles = [
      { id: 'stranger-2', display_name: 'Can', email: 'can@example.com' },
    ];
    tableData.messages = [];

    const { result } = renderHook(() => useNotificationsCenter());
    await flushAsync(6);
    expect(result.current.pendingRequests).toHaveLength(1);

    let ok = false;
    await act(async () => {
      ok = await result.current.rejectRequest('req-2');
    });
    await flushAsync(6);

    expect(ok).toBe(true);
    expect(result.current.pendingRequests.find((r) => r.id === 'req-2')).toBeUndefined();
    expect(result.current.pendingRequests).toHaveLength(0);
  });
});
