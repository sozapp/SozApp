import ShareVerseModal from '@/components/ShareVerseModal';
import { getBookIdByBookName, getVerseRefFromVerseId, getVerseTextByVerseId } from '@/constants/bible-index';
import { colors as themeColors, fonts } from '@/constants/theme';
import { verseTopics, type VerseTopic } from '@/constants/verse-topics';
import { useTranslation } from '@/context/LanguageContext';
import { useFavorites } from '@/hooks/useFavorites';
import { useHaptics } from '@/hooks/useHaptics';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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

const TOPIC_COLORS: Record<string, string> = {
  anxiety: '#6BA3BE',
  hope: '#D4A843',
  forgiveness: '#BE6B7C',
  patience: '#9A7C8A',
  gratitude: '#C4956A',
  family: '#7CB87C',
  hardship: '#B88A6A',
  love: '#BE6B7C',
  faith: '#7C8A9A',
  prayer: '#8A7C9A',
  'new-beginnings': '#7C9A8A',
  courage: '#9B8BB8',
  peace: '#6BA3BE',
  strength: '#8A9A7C',
};

type ResolvedVerse = {
  verseId: string;
  text: string;
  ref: string;
  bookId: string | null;
  chapter: number;
  verse: number;
};

function resolveTopicVerses(topic: VerseTopic): ResolvedVerse[] {
  const out: ResolvedVerse[] = [];
  for (const verseId of topic.verseIds) {
    const text = getVerseTextByVerseId(verseId);
    if (!text?.trim()) continue;
    const parts = verseId.split('-');
    const verse = parseInt(parts[parts.length - 1]!, 10);
    const chapter = parseInt(parts[parts.length - 2]!, 10);
    const book = parts.slice(0, -2).join('-');
    out.push({
      verseId,
      text: text.trim(),
      ref: getVerseRefFromVerseId(verseId),
      bookId: getBookIdByBookName(book),
      chapter,
      verse,
    });
  }
  return out;
}

export default function VerseTopicsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const safeBack = useSafeBack();
  const haptics = useHaptics();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [selected, setSelected] = useState<VerseTopic | null>(null);
  const [share, setShare] = useState<{ text: string; ref: string; bookId: string | null; chapter: number; verse: number } | null>(null);

  const resolvedVerses = useMemo(
    () => (selected ? resolveTopicVerses(selected) : []),
    [selected]
  );

  const openTopic = useCallback(
    (topic: VerseTopic) => {
      haptics.selection();
      setSelected(topic);
    },
    [haptics]
  );

  const onToggleFavorite = useCallback(
    async (verseId: string, text: string) => {
      const added = await toggleFavorite(verseId, text);
      if (added) haptics.success();
      else haptics.light();
    },
    [toggleFavorite, haptics]
  );

  const openInRead = useCallback(
    (v: ResolvedVerse) => {
      if (!v.bookId) return;
      haptics.selection();
      router.push({
        pathname: '/(tabs)/read',
        params: { bookId: v.bookId, chapter: String(v.chapter), verse: String(v.verse) },
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
            {selected ? selected.title : t('verseTopicsTitle')}
          </Text>
          {!selected ? (
            <Text style={[styles.headerSub, { color: theme.textMuted }]} numberOfLines={1}>
              {t('verseTopicsSubtitle')}
            </Text>
          ) : (
            <Text style={[styles.headerSub, { color: theme.textMuted }]} numberOfLines={1}>
              {t('verseTopicVerseCount', { n: resolvedVerses.length })}
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
            {verseTopics.map((topic) => {
              const accent = TOPIC_COLORS[topic.id] ?? ACCENT;
              return (
                <Pressable
                  key={topic.id}
                  style={[
                    styles.topicCard,
                    {
                      backgroundColor: theme.surface,
                      borderTopColor: accent,
                      width: CARD_W,
                    },
                  ]}
                  onPress={() => openTopic(topic)}
                  accessibilityRole="button"
                  accessibilityLabel={topic.title}
                >
                  <View style={[styles.topicIcon, { borderColor: `${accent}35` }]}>
                    <Ionicons
                      name={topic.icon as keyof typeof Ionicons.glyphMap}
                      size={22}
                      color={accent}
                    />
                  </View>
                  <Text style={[styles.topicTitle, { color: theme.text }]} numberOfLines={1}>
                    {topic.title}
                  </Text>
                  <Text style={[styles.topicDesc, { color: theme.textMuted }]} numberOfLines={3}>
                    {topic.description}
                  </Text>
                  <Text style={[styles.topicCount, { color: accent }]}>
                    {t('verseTopicVerseCount', { n: topic.verseIds.length })}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.topicLead, { color: theme.textMuted }]}>{selected.description}</Text>
          {resolvedVerses.map((v) => {
            const fav = isFavorite(v.verseId);
            return (
              <View
                key={v.verseId}
                style={[styles.verseCard, { backgroundColor: theme.surface }]}
              >
                <Pressable onPress={() => openInRead(v)} accessibilityRole="button">
                  <Text style={[styles.verseRef, { color: ACCENT }]}>{v.ref}</Text>
                  <Text style={[styles.verseText, { color: theme.text }]}>{v.text}</Text>
                </Pressable>
                <View style={styles.verseActions}>
                  <Pressable
                    style={styles.actionBtn}
                    onPress={() => void onToggleFavorite(v.verseId, v.text)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={t('favorites')}
                  >
                    <Ionicons
                      name={fav ? 'heart' : 'heart-outline'}
                      size={20}
                      color={fav ? ACCENT : theme.textMuted}
                    />
                  </Pressable>
                  <Pressable
                    style={styles.actionBtn}
                    onPress={() => {
                      haptics.light();
                      setShare({
                        text: v.text,
                        ref: v.ref,
                        bookId: v.bookId,
                        chapter: v.chapter,
                        verse: v.verse,
                      });
                    }}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={t('share')}
                  >
                    <Ionicons name="share-outline" size={20} color={theme.textMuted} />
                  </Pressable>
                  <Pressable
                    style={styles.actionBtn}
                    onPress={() => openInRead(v)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={t('read')}
                  >
                    <Ionicons name="book-outline" size={20} color={theme.textMuted} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <ShareVerseModal
        visible={share != null}
        onClose={() => setShare(null)}
        verseText={share?.text ?? ''}
        verseRef={share?.ref ?? ''}
        deepLinkParams={
          share?.bookId
            ? { bookId: share.bookId, chapter: share.chapter, verse: share.verse }
            : null
        }
      />
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
  topicCard: {
    borderRadius: 14,
    padding: 14,
    borderTopWidth: 3,
    minHeight: 148,
  },
  topicIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  topicTitle: {
    fontFamily: fonts.medium,
    fontSize: 15,
    marginBottom: 4,
  },
  topicDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  topicCount: {
    fontFamily: fonts.medium,
    fontSize: 11,
    marginTop: 10,
  },
  listContent: { padding: 16, paddingBottom: 40, gap: 12 },
  topicLead: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  verseCard: {
    borderRadius: 14,
    padding: 16,
  },
  verseRef: {
    fontFamily: fonts.medium,
    fontSize: 13,
    marginBottom: 8,
  },
  verseText: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 26,
  },
  verseActions: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(196,149,106,0.2)',
    paddingTop: 10,
  },
  actionBtn: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
