import { Text, View } from 'react-native';

export default function WatchApp() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#0A0A08',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
      }}
    >
      <Text style={{ color: '#C4956A', fontSize: 16, marginBottom: 8 }}>Söz Watch</Text>
      <Text style={{ color: '#E8DCCB', fontSize: 12, textAlign: 'center' }}>
        Expo tarafinda watchOS destegi sinirli. Tam watch app icin native Swift gerekecektir.
      </Text>
    </View>
  );
}
