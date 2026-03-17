import { colors, fonts } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { useCallback, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TURKEY_REGION = {
  latitude: 38.9637,
  longitude: 35.2433,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

type BibleLocation = {
  id: string;
  name: string;
  modern: string;
  coordinate: { latitude: number; longitude: number };
  description: string;
  verses: string[];
  color: string;
};

const bibleLocations: BibleLocation[] = [
  {
    id: 'ephesus',
    name: 'Efes',
    modern: 'Selçuk, İzmir',
    coordinate: { latitude: 37.9397, longitude: 27.3417 },
    description: "Pavlus'un kurduğu kiliselerden biri. Vahiy 2:1'de adı geçer.",
    verses: ['Vahiy 2:1-7', 'Efesliler 1:1', 'Elçilerin İşleri 19'],
    color: '#C4956A',
  },
  {
    id: 'antioch',
    name: 'Antakya',
    modern: 'Hatay',
    coordinate: { latitude: 36.2021, longitude: 36.1603 },
    description: '"Hristiyan" adının ilk kullanıldığı şehir.',
    verses: ['Elçilerin İşleri 11:26', 'Galatyalılar 2:11'],
    color: '#C4956A',
  },
  {
    id: 'tarsus',
    name: 'Tarsus',
    modern: 'Mersin',
    coordinate: { latitude: 36.9195, longitude: 34.8938 },
    description: "Pavlus'un doğduğu şehir.",
    verses: ['Elçilerin İşleri 9:11', 'Elçilerin İşleri 21:39'],
    color: '#C4956A',
  },
  {
    id: 'iconium',
    name: 'İkonium',
    modern: 'Konya',
    coordinate: { latitude: 37.8713, longitude: 32.4846 },
    description: "Pavlus'un ilk yolculuğunda ziyaret ettiği şehir.",
    verses: ['Elçilerin İşleri 13:51', 'Elçilerin İşleri 14:1'],
    color: '#C4956A',
  },
  {
    id: 'smyrna',
    name: 'İzmir',
    modern: 'İzmir',
    coordinate: { latitude: 38.4189, longitude: 27.1287 },
    description: "Yedi kiliseden biri. Vahiy'de övgüyle bahsedilir.",
    verses: ['Vahiy 2:8-11'],
    color: '#C4956A',
  },
  {
    id: 'pergamum',
    name: 'Bergama',
    modern: 'İzmir',
    coordinate: { latitude: 39.1199, longitude: 27.1839 },
    description: "Yedi kiliseden biri. \"Şeytan'ın tahtı\" olarak anılır.",
    verses: ['Vahiy 2:12-17'],
    color: '#C4956A',
  },
  {
    id: 'laodicea',
    name: 'Laodikya',
    modern: 'Denizli',
    coordinate: { latitude: 37.8333, longitude: 29.1167 },
    description: 'Yedi kiliseden biri. Ilık imanıyla uyarılan kilise.',
    verses: ['Vahiy 3:14-22'],
    color: '#C4956A',
  },
  {
    id: 'thyatira',
    name: 'Tiyatira',
    modern: 'Akhisar, Manisa',
    coordinate: { latitude: 38.9181, longitude: 27.8381 },
    description: "Yedi kiliseden biri. Lydia'nın memleketi.",
    verses: ['Vahiy 2:18-29', 'Elçilerin İşleri 16:14'],
    color: '#C4956A',
  },
  {
    id: 'sardis',
    name: 'Sart',
    modern: 'Salihli, Manisa',
    coordinate: { latitude: 38.4881, longitude: 28.0453 },
    description: 'Yedi kiliseden biri. Ölü sayılan ama yaşayan kilise.',
    verses: ['Vahiy 3:1-6'],
    color: '#C4956A',
  },
  {
    id: 'philadelphia',
    name: 'Alaşehir',
    modern: 'Manisa',
    coordinate: { latitude: 38.3489, longitude: 28.5197 },
    description: 'Yedi kiliseden biri. Sadık kilise.',
    verses: ['Vahiy 3:7-13'],
    color: '#C4956A',
  },
];

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a1a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d2d2d' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e0e0e' }] },
];

export default function MapScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const [selectedLocation, setSelectedLocation] = useState<BibleLocation | null>(null);

  const handleMarkerPress = useCallback((loc: BibleLocation) => {
    setSelectedLocation(loc);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSelectedLocation(null);
  }, []);

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={[styles.headerOverlay, { backgroundColor: theme.surface }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Anadolu'da İncil</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
            İncil'in geçtiği kutsal yerler
          </Text>
        </View>
        <View style={styles.webPlaceholder}>
          <Text style={[styles.webPlaceholderText, { color: theme.textMuted }]}>
            Harita yalnızca iOS ve Android'de kullanılabilir.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={TURKEY_REGION}
          mapType="mutedStandard"
          showsUserLocation={false}
          customMapStyle={isDark ? DARK_MAP_STYLE : undefined}
        >
          {bibleLocations.map((loc) => (
            <Marker
              key={loc.id}
              coordinate={loc.coordinate}
              onPress={() => handleMarkerPress(loc)}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View style={styles.markerWrap}>
                <View style={[styles.markerDot, { backgroundColor: loc.color }]} />
                <Text style={styles.markerLabel} numberOfLines={1}>
                  {loc.name}
                </Text>
              </View>
            </Marker>
          ))}
        </MapView>
        <View style={[styles.headerOverlay, { backgroundColor: theme.surface }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Anadolu'da İncil</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
            İncil'in geçtiği kutsal yerler
          </Text>
        </View>
      </View>

      {selectedLocation && (
        <View style={[styles.bottomSheet, { backgroundColor: theme.surface }]}>
          <Pressable style={styles.closeBtn} onPress={handleCloseSheet} hitSlop={12}>
            <Ionicons name="close" size={24} color={theme.text} />
          </Pressable>
          <ScrollView
            style={styles.bottomSheetScroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Text style={[styles.sheetTitle, { color: theme.text }]}>{selectedLocation.name}</Text>
            <Text style={[styles.sheetModern, { color: theme.textMuted }]}>
              Günümüzde: {selectedLocation.modern}
            </Text>
            <Text style={[styles.sheetDescription, { color: theme.text }]}>
              {selectedLocation.description}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.versesScroll}
            >
              {selectedLocation.verses.map((v) => (
                <View key={v} style={[styles.verseBadge, { borderColor: colors.accent }]}>
                  <Text style={[styles.verseBadgeText, { color: theme.text }]}>{v}</Text>
                </View>
              ))}
            </ScrollView>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontFamily: fonts.thin,
    fontSize: 32,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontFamily: fonts.italic,
    fontSize: 14,
  },
  markerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.white,
  },
  markerLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.accent,
    marginTop: 2,
    maxWidth: 60,
  },
  bottomSheet: {
    height: 200,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomSheetScroll: {
    flex: 1,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 24,
    zIndex: 1,
    padding: 4,
  },
  sheetTitle: {
    fontFamily: fonts.medium,
    fontSize: 20,
    marginBottom: 2,
  },
  sheetModern: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginBottom: 8,
  },
  sheetDescription: {
    fontFamily: fonts.italic,
    fontSize: 14,
    marginBottom: 10,
    lineHeight: 20,
  },
  versesScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  verseBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  verseBadgeText: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  webPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  webPlaceholderText: {
    fontFamily: fonts.italic,
    fontSize: 16,
  },
});
