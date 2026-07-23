import { useEffect, useRef, useState } from 'react';
import { Animated, Text, type StyleProp, type TextStyle } from 'react-native';

export type AnimatedCounterProps = {
  value: number;
  duration?: number;
  style?: StyleProp<TextStyle>;
  /** Yuvarlama: varsayılan Math.round */
  format?: (n: number) => string;
};

/**
 * Sayı değişince eski → yeni arası kısa sayım animasyonu.
 * İlk mount ve mount sonrası ilk hydration (örn. 0→AsyncStorage) animasyonsuz;
 * sonraki değişimlerde ~duration ms saydırır.
 */
export function AnimatedCounter({
  value,
  duration = 500,
  style,
  format = (n) => String(Math.round(n)),
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(value);
  const anim = useRef(new Animated.Value(value)).current;
  const isFirstRender = useRef(true);
  const awaitingHydration = useRef(true);

  useEffect(() => {
    const id = anim.addListener(({ value: v }) => {
      setDisplay(v);
    });
    return () => {
      anim.removeListener(id);
    };
  }, [anim]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      anim.setValue(value);
      setDisplay(value);
      return;
    }

    // AsyncStorage vb. ilk gerçek değer — 0'dan saydırma
    if (awaitingHydration.current) {
      awaitingHydration.current = false;
      anim.setValue(value);
      setDisplay(value);
      return;
    }

    anim.stopAnimation();
    Animated.timing(anim, {
      toValue: value,
      duration,
      useNativeDriver: false,
    }).start();
  }, [value, duration, anim]);

  return <Text style={style}>{format(display)}</Text>;
}
