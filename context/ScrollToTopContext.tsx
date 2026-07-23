import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';
import type { FlatList, ScrollView } from 'react-native';

/** Tab bar'daki ana ekranlar (href: null gizli rotalar hariç). */
export type TabScrollKey = 'index' | 'read' | 'explore' | 'notes' | 'profile';

type ScrollToTopFn = () => void;

type ScrollToTopContextValue = {
  register: (tab: TabScrollKey, scrollToTop: ScrollToTopFn) => () => void;
  scrollToTop: (tab: TabScrollKey) => void;
};

const ScrollToTopContext = createContext<ScrollToTopContextValue | null>(null);

export function ScrollToTopProvider({ children }: { children: ReactNode }) {
  const handlersRef = useRef<Partial<Record<TabScrollKey, ScrollToTopFn>>>({});

  const register = useCallback((tab: TabScrollKey, scrollToTop: ScrollToTopFn) => {
    handlersRef.current[tab] = scrollToTop;
    return () => {
      if (handlersRef.current[tab] === scrollToTop) {
        delete handlersRef.current[tab];
      }
    };
  }, []);

  const scrollToTop = useCallback((tab: TabScrollKey) => {
    handlersRef.current[tab]?.();
  }, []);

  const value = useMemo(() => ({ register, scrollToTop }), [register, scrollToTop]);

  return <ScrollToTopContext.Provider value={value}>{children}</ScrollToTopContext.Provider>;
}

export function useScrollToTopRegistry() {
  const ctx = useContext(ScrollToTopContext);
  if (!ctx) {
    throw new Error('useScrollToTopRegistry must be used within ScrollToTopProvider');
  }
  return ctx;
}

type ScrollViewLike = Pick<ScrollView, 'scrollTo'>;
type FlatListLike = Pick<FlatList<unknown>, 'scrollToOffset'>;

/**
 * Mount olunca tab'ın ana scroll'unu kaydeder; tab'a tekrar basınca yukarı kaydırılır.
 * ScrollView veya FlatList ref'i döner.
 */
export function useRegisterTabScrollToTop<T extends ScrollViewLike | FlatListLike>(
  tab: TabScrollKey
): RefObject<T | null> {
  const { register } = useScrollToTopRegistry();
  const ref = useRef<T | null>(null);

  useEffect(() => {
    return register(tab, () => {
      const node = ref.current;
      if (!node) return;
      if ('scrollTo' in node && typeof node.scrollTo === 'function') {
        node.scrollTo({ y: 0, animated: true });
        return;
      }
      if ('scrollToOffset' in node && typeof node.scrollToOffset === 'function') {
        node.scrollToOffset({ offset: 0, animated: true });
      }
    });
  }, [register, tab]);

  return ref;
}
