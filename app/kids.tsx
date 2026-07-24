import { getBookIdByBookName } from '@/constants/bible-index';
import { kidsStories, type KidsStory } from '@/constants/kids-stories';
import { colors as themeColors, fonts } from '@/constants/theme';
import { useTranslation } from '@/context/LanguageContext';
import { useHaptics } from '@/hooks/useHaptics';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ACCENT = '#C4956A';
const { width: SCREEN_W } = Dimensions.get('window');
const CARD_GAP = 10;
const CARD_PAD = 16;
const CARD_W = (SCREEN_W - CARD_PAD * 2 - CARD_GAP) / 2;

export default function KidsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const safeBack = useSafeBack();
  const haptics = useHaptics();
  const [selected, setSelected] = useState<KidsStory | null>(null);

  const openStory = useCallback(
    (story: KidsStory) => {
      haptics.selection();
      setSelected(story);
    },
    [haptics]
  );

  const readRealVerse = useCallback(
    (story: KidsStory) => {
      const bookId = getBookIdByBookName(story.bookName);
      if (!bookId) return;
      haptics.light();
      router.push({
        pathname: '/(tabs)/read',
        params: { bookId, chapter: String(story.chapter), verse: String(story.verse) },
      });
    },
    [router, haptics]
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: themeColors.accentBorder }]}>
        <Pressable
          onPress={() => {
            if (selected) {
              setSelected(null);
              return;
            }
            safeBack();
          }}
          style={styles.backBtn}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {selected ? selected.title : t('kidsTitle')}
          </Text>
          {!selected ? (
            <Text style={[styles.headerSub, { color: theme.textMuted }]} numberOfLines={1}>
              {t('kidsSubtitle')}
            </Text>
          ) : (
            <Text style={[styles.headerSub, { color: theme.textMuted }]} numberOfLines={1}>
              {selected.verseRef}
            </Text>
          )}
        </View>
        <View style={styles.headerRight} />
      </View>

      {!selected ? (
        <ScrollView
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.grid}>
            {kidsStories.map((story) => (
              <Pressable
                key={story.id}
                style={[
                  styles.storyCard,
                  { backgroundColor: theme.surface, width: CARD_W },
                ]}
                onPress={() => openStory(story)}
                accessibilityRole="button"
                accessibilityLabel={story.title}
              >
                <View style={[styles.storyIcon, { borderColor: `${ACCENT}35` }]}>
                  <Ionicons
                    name={story.icon as keyof typeof Ionicons.glyphMap}
                    size={26}
                    color={ACCENT}
                  />
                </View>
                <Text style={[styles.storyTitle, { color: theme.text }]} numberOfLines={2}>
                  {story.title}
                </Text>
                <Text style={[styles.storyRef, { color: theme.textMuted }]}>
                  {story.verseRef}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.detailContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.detailIconWrap, { borderColor: `${ACCENT}35` }]}>
            <Ionicons
              name={selected.icon as keyof typeof Ionicons.glyphMap}
              size={40}
              color={ACCENT}
            />
          </View>
          <Text style={[styles.detailSummary, { color: theme.text }]}>{selected.summary}</Text>

          <Pressable
            style={[styles.readBtn, { backgroundColor: ACCENT }]}
            onPress={() => readRealVerse(selected)}
            accessibilityRole="button"
            accessibilityLabel={t('kidsReadRealVerse')}
          >
            <Ionicons name="book-outline" size={18} color={themeColors.white} />
            <Text style={styles.readBtnText}>{t('kidsReadRealVerse')}</Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  backBtn: { padding: 4 },
  headerTextWrap: { flex: 1 },
  headerTitle: {
    fontFamily: fonts.medium,
    fontSize: 18,
  },
  headerSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: { width: 28 },
  gridContent: { padding: CARD_PAD, paddingBottom: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP },
  storyCard: {
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
  },
  storyIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  storyTitle: {
    fontFamily: fonts.medium,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  storyRef: {
    fontFamily: fonts.regular,
    fontSize: 11,
    textAlign: 'center',
  },
  detailContent: {
    padding: 24,
    paddingTop: 32,
    alignItems: 'center',
  },
  detailIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  detailSummary: {
    fontFamily: fonts.regular,
    fontSize: 19,
    lineHeight: 30,
    textAlign: 'center',
    marginBottom: 32,
  },
  readBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
  },
  readBtnText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: themeColors.white,
  },
});
