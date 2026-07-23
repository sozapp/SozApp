import { act } from 'react-test-renderer';
import {
  authState,
  flushAsync,
  mockSupabaseClient,
  renderHook,
  resetMockSupabase,
  tableData,
} from '@/hooks/testUtils';
import { useChatThread } from '@/hooks/useMessages';

jest.mock('@/constants/supabase', () => ({
  supabase: mockSupabaseClient,
}));

beforeEach(() => {
  resetMockSupabase();
  tableData.messages = [];
});

describe('useChatThread — sendMessage()', () => {
  it('boş (veya sadece boşluk) metni reddeder ve mesaj listesine hiçbir şey eklemez', async () => {
    authState.user = { id: 'me', email: 'me@example.com' };

    const { result } = renderHook(() => useChatThread('friend-1'));
    await flushAsync();

    let sendResult: Awaited<ReturnType<typeof result.current.sendMessage>> = { ok: true };
    await act(async () => {
      sendResult = await result.current.sendMessage('   ');
    });

    expect(sendResult.ok).toBe(false);
    expect(sendResult.error).toBeTruthy();
    expect(result.current.messages).toHaveLength(0);
  });

  it('2000 karakterden uzun metni reddeder', async () => {
    authState.user = { id: 'me', email: 'me@example.com' };

    const { result } = renderHook(() => useChatThread('friend-1'));
    await flushAsync();

    let sendResult: Awaited<ReturnType<typeof result.current.sendMessage>> = { ok: true };
    await act(async () => {
      sendResult = await result.current.sendMessage('x'.repeat(2001));
    });

    expect(sendResult.ok).toBe(false);
    expect(sendResult.error).toBeTruthy();
    expect(result.current.messages).toHaveLength(0);
  });

  it('cooldown içinde (400ms) ikinci gönderimi reddeder', async () => {
    authState.user = { id: 'me', email: 'me@example.com' };

    const { result } = renderHook(() => useChatThread('friend-1'));
    await flushAsync();

    tableData.messages = [
      {
        id: 'msg-1',
        sender_id: 'me',
        recipient_id: 'friend-1',
        text: 'Bir',
        created_at: '2026-01-01T00:00:00.000Z',
        read_at: null,
      },
    ];

    let first: Awaited<ReturnType<typeof result.current.sendMessage>> = { ok: false };
    let second: Awaited<ReturnType<typeof result.current.sendMessage>> = { ok: true };
    await act(async () => {
      first = await result.current.sendMessage('Bir');
      second = await result.current.sendMessage('İki');
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.error).toBeTruthy();
    // İlk mesaj listeye eklendi; ikinci reddedildiği için hâlâ 1
    expect(result.current.messages).toHaveLength(1);
  });

  it('başarılı insert sonrası gönderilen mesajı listeye ekler', async () => {
    authState.user = { id: 'me', email: 'me@example.com' };

    const { result } = renderHook(() => useChatThread('friend-1'));
    // Mount sırasında tetiklenen load() boş geçmişi okusun, sonra insert'in
    // dönmesini istediğimiz satırı tanımlayalım — aksi halde load() de aynı
    // satırı okuyup mesajı ikiye katlamış gibi görünebilir.
    await flushAsync();

    tableData.messages = [
      {
        id: 'msg-1',
        sender_id: 'me',
        recipient_id: 'friend-1',
        text: 'Merhaba!',
        created_at: '2026-01-01T00:00:00.000Z',
        read_at: null,
      },
    ];

    let sendResult: Awaited<ReturnType<typeof result.current.sendMessage>> = { ok: false };
    await act(async () => {
      sendResult = await result.current.sendMessage('Merhaba!');
    });

    expect(sendResult.ok).toBe(true);
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toMatchObject({
      id: 'msg-1',
      text: 'Merhaba!',
      senderId: 'me',
      recipientId: 'friend-1',
    });
  });
});
