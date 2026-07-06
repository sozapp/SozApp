import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { paddingTop: Math.max(insets.top, 8) }]}
    >
      <View style={styles.banner}>
        <Text style={styles.text}>
          Çevrimdışı mod — bazı özellikler kısıtlı
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  banner: {
    backgroundColor: 'rgba(196,149,80,0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    maxWidth: '100%',
  },
  text: {
    fontSize: 11,
    color: 'rgba(232,224,208,0.55)',
    textAlign: 'center',
  },
});
