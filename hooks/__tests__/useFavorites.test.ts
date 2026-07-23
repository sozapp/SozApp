import { act } from 'react-test-renderer';
import { flushAsync, renderHook } from '@/hooks/testUtils';
import { useFavorites } from '@/hooks/useFavorites';

// useFavorites() içindeki useFocusEffect(expo-router) bir NavigationContainer
// gerektiriyor — testte gerçek router olmadığından no-op'a indirgiyoruz.
// (toggleFavorite zaten focus efektine bağlı değil, sadece kendi state'i üzerinden çalışır.)
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
}));

const VERSE_ID = 'Yuhanna-3-16';

describe('useFavorites — toggleFavorite()', () => {
  it('aynı ayeti iki kez çağırınca önce ekler sonra çıkarır (toggle davranışı)', async () => {
    const { result } = renderHook(() => useFavorites());
    await flushAsync();

    expect(result.current.isFavorite(VERSE_ID)).toBe(false);

    let addedReturn = false;
    await act(async () => {
      addedReturn = await result.current.toggleFavorite(VERSE_ID);
    });

    expect(addedReturn).toBe(true);
    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.isFavorite(VERSE_ID)).toBe(true);

    let removedReturn = true;
    await act(async () => {
      removedReturn = await result.current.toggleFavorite(VERSE_ID);
    });

    expect(removedReturn).toBe(false);
    expect(result.current.favorites).toHaveLength(0);
    expect(result.current.isFavorite(VERSE_ID)).toBe(false);
  });
});
