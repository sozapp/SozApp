import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * OS "Hareketi Azalt" / Reduce Motion ayarı.
 * Varsayılan false; açılınca confetti, splash, tab bounce vb. sadeleştirilir.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        setReduceMotion(enabled);
      }
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
