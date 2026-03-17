import { newTestament } from '@/constants/new-testament';
import { colors, fonts } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { VerseNT } from '@/constants/new-testament';

const ACCENT = '#C4956A';
const BORDER_COLOR = 'rgba(196,149,106,0.3)';
const SUGGESTIONS = ['sevgi', 'iman', 'umut', 'ışık', 'barış'];

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ç/g, 'c');
}

type SearchHit = {
  bookIndex: number;
  chapterIndexInBook: number;
  bookName: string;
  verse: VerseNT;
};

/** Build mapping from normalized string index to original string index (inclusive end). */
function buildNormalizedMap(original: string): number[] {
  const arr: number[] = [];
  for (let i = 0; i < original.length; i++) {
    const n = normalize(original[i]);
    for (let j = 0; j < n.length; j++) arr.push(i);
  }
  return arr;
}

function getHighlightSegments(verseText: string, query: string): { type: 'normal' | 'highlight'; text: string }[] {
  if (!query.trim()) return [{ type: 'normal', text: verseText }];
  const nText = normalize(verseText);
  const nQuery = normalize(query).trim();
  if (nQuery.length === 0) return [{ type: 'normal', text: verseText }];
  const map = buildNormalizedMap(verseText);
  const segments: { type: 'normal' | 'highlight'; text: string }[] = [];
  let pos = 0;
  let idx: number;
  while ((idx = nText.indexOf(nQuery, pos)) !== -1) {
    const startOrig = map[idx];
    const endOrig = (map[idx + nQuery.length - 1] ?? startOrig) + 1;
    if (startOrig > pos) {
      segments.push({ type: 'normal', text: verseText.slice(map[pos], startOrig) });
    }
    segments.push({ type: 'highlight', text: verseText.slice(startOrig, endOrig) });
    pos = idx + nQuery.length;
  }
  if (pos < nText.length) {
    segments.push({ type: 'normal', text: verseText.slice(map[pos]) });
  }
  return segments.length ? segments : [{ type: 'normal', text: verseText }];
}

const allHits: SearchHit[] = newTestament.flatMap((book, bookIndex) =>
  book.chapters.flatMap((ch, chapterIndexInBook) =>
    ch.verses.map((verse) => ({
      bookIndex,
      chapterIndexInBook,
      bookName: book.name,
      verse,
    }))
  )
);

export default function SearchScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const router = useRouter();
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  const trimmedQuery = query.trim();
  const results = useMemo(() => {
    if (trimmedQuery.length < 2) return [];
    const nq = normalize(trimmedQuery);
    return allHits.filter(({ bookName, verse }) => {
      const inText = normalize(verse.text).includes(nq);
      const inBook = normalize(bookName).includes(nq);
      return inText || inBook;
    });
  }, [trimmedQuery]);

  const hasSearched = trimmedQuery.length >= 2;
  const showEmptyState = !hasSearched;

  const openRead = useCallback(
    (bookId: string, chapterNum: number) => {
      router.push({
        pathname: '/(tabs)/read',
        params: { bookId, chapter: String(chapterNum) },
      });
    },
    [router]
  );

  const setSuggestion = useCallback((word: string) => {
    setQuery(word);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const clearInput = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, []);

  const renderResult = useCallback(
    ({ item }: { item: SearchHit }) => {
      const refLabel = `${item.verse.book} ${item.verse.chapter}:${item.verse.verse}`;
      const segments = getHighlightSegments(item.verse.text, trimmedQuery);
      const book = newTestament[item.bookIndex];
      return (
        <Pressable
          style={[styles.resultCard, { backgroundColor: theme.surface }]}
          onPress={() => openRead(book.id, item.verse.chapter)}
        >
          <Text style={styles.resultRef}>{refLabel}</Text>
          <Text style={[styles.resultText, { color: theme.text }]}>
            {segments.map((seg, i) =>
              seg.type === 'highlight' ? (
                <Text key={i} style={styles.highlight}>
                  {seg.text}
                </Text>
              ) : (
                <Text key={i}>{seg.text}</Text>
              )
            )}
          </Text>
        </Pressable>
      );
    },
    [theme.surface, theme.text, trimmedQuery, openRead]
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.header, { borderBottomColor: BORDER_COLOR }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
          <View style={[styles.inputWrap, { backgroundColor: theme.surface, borderColor: BORDER_COLOR }]}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: theme.text }]}
              placeholder="Ayet veya kelime ara..."
              placeholderTextColor={theme.textMuted}
              value={query}
              onChangeText={setQuery}
              autoFocus
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <Pressable onPress={clearInput} style={styles.clearBtn} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={theme.textMuted} />
              </Pressable>
            )}
          </View>
        </View>

        {hasSearched && (
          <Text style={[styles.resultCount, { color: theme.textMuted }]}>
            {results.length} sonuç bulundu
          </Text>
        )}

        {showEmptyState ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Ne aramak istersin?</Text>
            <View style={styles.chipRow}>
              {SUGGESTIONS.map((word) => (
                <Pressable
                  key={word}
                  style={[styles.chip, { backgroundColor: theme.surface, borderColor: BORDER_COLOR }]}
                  onPress={() => setSuggestion(word)}
                >
                  <Text style={[styles.chipText, { color: theme.text }]}>{word}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : results.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.noResults, { color: theme.textMuted }]}>Sonuç bulunamadı</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.verse.id}
            renderItem={renderResult}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  keyboard: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 0.5,
  },
  backBtn: { padding: 4 },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderRadius: 10,
    paddingLeft: 16,
    paddingRight: 10,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 16,
    padding: 0,
  },
  clearBtn: { padding: 4 },
  resultCount: {
    fontFamily: fonts.regular,
    fontSize: 12,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
  },
  listContent: { padding: 16, paddingBottom: 32 },
  resultCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
  },
  resultRef: {
    fontFamily: fonts.medium,
    fontSize: 12,
    letterSpacing: 1.2,
    color: ACCENT,
    marginBottom: 6,
  },
  resultText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 22,
  },
  highlight: {
    fontFamily: fonts.medium,
    color: ACCENT,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: {
    fontFamily: fonts.italic,
    fontSize: 18,
    marginBottom: 24,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 0.5,
  },
  chipText: {
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  noResults: {
    fontFamily: fonts.italic,
    fontSize: 16,
  },
});
