import { colors, fonts, borderRadius } from '@/constants/theme';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import {
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeBack } from '@/hooks/useSafeBack';

const ACCENT = '#C4956A';

const APP_LINK_PLACEHOLDER = 'https://soz.app'; // placeholder
const INVITE_MESSAGE = `Söz uygulamasını keşfet — Türkçe Kutsal Kitap, günlük ayet ve daha fazlası.\n\n${APP_LINK_PLACEHOLDER}`;

export default function InviteScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const safeBack = useSafeBack();

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: INVITE_MESSAGE,
        title: 'Söz Uygulaması',
      });
    } catch (_) {}
  }, []);

  const swipeBack = useSwipeBack();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.flex1} {...swipeBack}>
      <View style={[styles.header, { borderBottomColor: colors.accentBorder }]}>
        <Pressable
          onPress={() => safeBack()}
          style={styles.backBtn}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Geri git"
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Arkadaşını Davet Et</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.lead, { color: theme.textMuted }]}>
          Söz'ü sevdiklerinle paylaş. Davet kartını gönder, birlikte okuyun.
        </Text>

        <View style={[styles.cardPreview, { backgroundColor: '#1A1208', borderColor: colors.accentBorder }]}>
          <View style={styles.cardPreviewInner}>
            <Text style={styles.cardLogo}>Söz</Text>
            <Text style={styles.cardMessage}>
              Söz uygulamasını keşfet — Türkçe Kutsal Kitap, günlük ayet, Mezmurlar ve daha fazlası.
            </Text>
            <View style={styles.cardLinkRow}>
              <Ionicons name="link" size={14} color={ACCENT} />
              <Text style={styles.cardLink}>{APP_LINK_PLACEHOLDER}</Text>
            </View>
          </View>
        </View>

        <Pressable style={[styles.shareBtn, { backgroundColor: ACCENT }]} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={22} color={colors.white} />
          <Text style={styles.shareBtnText}>Daveti Paylaş</Text>
        </Pressable>
      </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex1: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { fontFamily: fonts.medium, fontSize: 18 },
  content: { flex: 1, padding: 24 },
  lead: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  cardPreview: {
    borderRadius: borderRadius.card,
    borderWidth: 0.5,
    padding: 20,
    marginBottom: 24,
  },
  cardPreviewInner: {},
  cardLogo: {
    fontFamily: fonts.thin,
    fontSize: 28,
    color: ACCENT,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  cardMessage: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: '#E8E0D0',
    marginBottom: 12,
  },
  cardLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardLink: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: ACCENT,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: borderRadius.button,
    paddingVertical: 16,
  },
  shareBtnText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.white,
  },
});
