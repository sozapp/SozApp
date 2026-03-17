import { colors, fonts } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ViewShot from 'react-native-view-shot';

const CARD_THEMES = [
  { id: 'gece', name: 'Gece', bg: '#1A1208', text: '#E8E0D0' },
  { id: 'kehribar', name: 'Kehribar', bg: '#2D1F0A', text: '#E8E0D0' },
  { id: 'deniz', name: 'Deniz', bg: '#0A1520', text: '#E8E0D0' },
  { id: 'krem', name: 'Krem', bg: '#F5F0E8', text: '#1A1208' },
] as const;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = 24;
const CARD_WIDTH = SCREEN_WIDTH - CARD_PADDING * 2;
const CARD_ASPECT = 1.2;
const CARD_HEIGHT = CARD_WIDTH * (1 / CARD_ASPECT);

export default function ShareCardScreen() {
  const params = useLocalSearchParams<{ text?: string; ref?: string }>();
  const router = useRouter();
  const viewShotRef = useRef<ViewShot>(null);
  const [themeIndex, setThemeIndex] = useState(0);
  const [sharing, setSharing] = useState(false);

  const verseText = params.text ?? '';
  const verseRef = params.ref ?? '';
  const theme = CARD_THEMES[themeIndex];
  const hasContent = Boolean(verseText.trim() && verseRef.trim());

  const handleShare = async () => {
    if (!hasContent || !viewShotRef.current) return;
    try {
      setSharing(true);
      const uri = await viewShotRef.current.capture();
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        setSharing(false);
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Ayet kartını paylaş',
      });
    } catch (_) {
      // ignore
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { borderBottomColor: colors.dark.surface }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.dark.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.dark.text }]}>Paylaşım kartı</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardWrapper}>
          <ViewShot
            ref={viewShotRef}
            options={{ format: 'png', quality: 1 }}
            style={[styles.shotWrapper, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
          >
            <View
              style={[
                styles.card,
                {
                  width: CARD_WIDTH,
                  height: CARD_HEIGHT,
                  backgroundColor: theme.bg,
                },
              ]}
            >
              <View style={styles.cardInner}>
                <Text style={[styles.cardLogo, { color: colors.accent }]}>SÖZ</Text>
                <Text
                  style={[
                    styles.cardVerse,
                    { color: theme.text },
                  ]}
                  numberOfLines={6}
                >
                  {hasContent ? verseText : 'Ayet metni yüklenmedi'}
                </Text>
                {verseRef ? (
                  <Text style={[styles.cardRef, { color: colors.accent }]}>
                    — {verseRef}
                  </Text>
                ) : null}
              </View>
              <View style={[styles.cardBorderCorner, styles.cornerTL]} />
              <View style={[styles.cardBorderCorner, styles.cornerTR]} />
              <View style={[styles.cardBorderCorner, styles.cornerBL]} />
              <View style={[styles.cardBorderCorner, styles.cornerBR]} />
            </View>
          </ViewShot>
        </View>

        <Text style={[styles.themeLabel, { color: colors.dark.textMuted }]}>Tema</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.themeRow}
        >
          {CARD_THEMES.map((t, i) => (
            <Pressable
              key={t.id}
              style={[
                styles.themeCircle,
                { backgroundColor: t.bg },
                themeIndex === i && styles.themeCircleSelected,
              ]}
              onPress={() => setThemeIndex(i)}
            />
          ))}
        </ScrollView>

        <Pressable
          style={[styles.shareButton, sharing && styles.shareButtonDisabled]}
          onPress={handleShare}
          disabled={!hasContent || sharing}
        >
          <Text style={styles.shareButtonText}>
            {sharing ? 'Hazırlanıyor...' : "Instagram / WhatsApp'a Paylaş"}
          </Text>
        </Pressable>

        <Text style={[styles.watermark, { color: colors.dark.textMuted }]}>
          Söz uygulamasıyla oluşturuldu
        </Text>
      </ScrollView>
    </View>
  );
}

const cornerSize = 20;
const cornerBorder = 2;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: fonts.medium,
    fontSize: 18,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: CARD_PADDING,
    paddingTop: 24,
    paddingBottom: 40,
  },
  cardWrapper: {
    alignItems: 'center',
    marginBottom: 28,
  },
  shotWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  card: {
    borderRadius: 10,
    padding: 24,
    overflow: 'visible',
  },
  cardInner: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardLogo: {
    fontFamily: fonts.thin,
    fontSize: 14,
    letterSpacing: 2,
  },
  cardVerse: {
    fontFamily: fonts.italic,
    fontSize: 18,
    lineHeight: 28,
    flex: 1,
    marginVertical: 16,
  },
  cardRef: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  cardBorderCorner: {
    position: 'absolute',
    width: cornerSize,
    height: cornerSize,
    borderColor: colors.accent,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: cornerBorder,
    borderLeftWidth: cornerBorder,
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: cornerBorder,
    borderRightWidth: cornerBorder,
    borderTopRightRadius: 10,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: cornerBorder,
    borderLeftWidth: cornerBorder,
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: cornerBorder,
    borderRightWidth: cornerBorder,
    borderBottomRightRadius: 10,
  },
  themeLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginBottom: 12,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 28,
    paddingRight: CARD_PADDING,
  },
  themeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  themeCircleSelected: {
    borderWidth: 3,
    borderColor: colors.accent,
  },
  shareButton: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  shareButtonDisabled: {
    opacity: 0.7,
  },
  shareButtonText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: '#fff',
  },
  watermark: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'center',
  },
});
