import { bookList } from '@/constants/bible-index';
import { newTestament } from '@/constants/new-testament';
import { fonts } from '@/constants/theme';
import { useTranslation } from '@/context/LanguageContext';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SEARCH_HISTORY_KEY = '@soz/searchHistory';
const MAX_HISTORY = 8;

const SUGGESTIONS = [
  'sevgi',
  'iman',
  'umut',
  'ışık',
  'barış',
  'dua',
  'affetmek',
  'bereket',
  'şükür',
  'mucize',
  'merhamet',
  'kurtuluş',
  'huzur',
  'güç',
  'teselli',
];

const FILTER_OPTIONS: (string | null)[] = [
  null,
  'Matta',
  'Markos',
  'Luka',
  'Yuhanna',
  'Romalılar',
  'Vahiy',
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/İ/g, 'i')
    .replace(/Ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/Ö/g, 'o')
    .replace(/Ç/g, 'c');
}

function getBookIdByName(bookName: string): string | null {
  return bookList.find((b) => b.name === bookName)?.id ?? null;
}

type SearchResult = {
  book: string;
  chapter: number;
  verse: number;
  text: string;
};

async function loadSearchHistory(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
    if (raw == null) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

export default function SearchScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [filterBook, setFilterBook] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      loadSearchHistory().then(setSearchHistory);
    }, [])
  );

  const saveToHistory = useCallback(async (query: string) => {
    const q = query.trim();
    if (q.length < 2) return;
    try {
      const raw = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      const history: string[] = raw ? JSON.parse(raw) : [];
      const updated = [q, ...history.filter((h) => h !== q)].slice(0, MAX_HISTORY);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      setSearchHistory(updated);
    } catch (_) {}
  }, []);

  const removeFromHistory = useCallback(async (item: string) => {
    try {
      const raw = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      const history: string[] = raw ? JSON.parse(raw) : [];
      const updated = history.filter((h) => h !== item);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      setSearchHistory(updated);
    } catch (_) {}
  }, []);

  const results = useMemo(() => {
    if (searchText.trim().length < 2) return [];
    const query = normalize(searchText.trim());
    const found: SearchResult[] = [];
    for (const book of newTestament) {
      for (const chapter of book.chapters) {
        for (const verse of chapter.verses) {
          if (normalize(verse.text).includes(query)) {
            found.push({
              book: book.name,
              chapter: chapter.chapter,
              verse: verse.verse,
              text: verse.text,
            });
            if (found.length >= 50) break;
          }
        }
        if (found.length >= 50) break;
      }
      if (found.length >= 50) break;
    }
    return found;
  }, [searchText]);

  const filteredResults = useMemo(() => {
    if (filterBook == null) return results;
    return results.filter((r) => r.book === filterBook);
  }, [results, filterBook]);

  const hasSearched = searchText.trim().length >= 2;
  const hasHistory = searchHistory.length > 0;
  const showSuggestionsOnly = !hasSearched && !hasHistory;
  const showHistorySection = !hasSearched && hasHistory;
  const showNoResults = hasSearched && filteredResults.length === 0;

  const runSearch = useCallback((text: string) => {
    setSearchText(text);
  }, []);

  const renderHighlightedText = useCallback(
    (text: string, query: string) => {
      const nText = normalize(text);
      const nQuery = normalize(query);
      const idx = nText.indexOf(nQuery);
      if (idx === -1) {
        return (
          <Text style={[styles.resultText, { color: colors.text }]}>{text}</Text>
        );
      }
      return (
        <Text style={[styles.resultText, { color: colors.text }]}>
          {text.slice(0, idx)}
          <Text style={styles.resultHighlight}>{text.slice(idx, idx + query.length)}</Text>
          {text.slice(idx + query.length)}
        </Text>
      );
    },
    [colors.text]
  );

  const onResultPress = useCallback(
    (item: SearchResult) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      saveToHistory(searchText.trim());
      const bookId = getBookIdByName(item.book);
      if (bookId) {
        router.push({
          pathname: '/(tabs)/read',
          params: {
            bookId,
            chapter: String(item.chapter),
            highlightVerse: String(item.verse),
          },
        });
      }
    },
    [searchText, saveToHistory, router]
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: colors.surface,
                borderColor: isFocused ? '#C4956A' : 'rgba(196,149,80,0.3)',
              },
            ]}
          >
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: colors.text }]}
              placeholder="Ayet veya kelime ara..."
              placeholderTextColor={colors.textMuted}
              value={searchText}
              onChangeText={setSearchText}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              autoFocus
              returnKeyType="search"
              autoCapitalize="none"
            />
            {searchText.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchText('');
                  inputRef.current?.focus();
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.clearBtn}
              >
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {hasSearched && (
          <View style={[styles.resultsMeta, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => Keyboard.dismiss()}>
              <Text style={[styles.resultsCount, { color: colors.textMuted }]}>
                {filteredResults.length} {t('resultsFound')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterBtn}
              onPress={() => setShowFilter(true)}
            >
              <Ionicons name="filter-outline" size={16} color="#C4956A" />
              <Text style={styles.filterText}>{filterBook ?? t('filterAll')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {showSuggestionsOnly && (
          <View style={styles.suggestionsSection}>
            <Text style={[styles.suggestionsTitle, { color: colors.textMuted }]}>
              {t('searchSuggestionsTitle')}
            </Text>
            <View style={styles.suggestionsWrap}>
              {SUGGESTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.chip}
                  onPress={() => {
                    setSearchText(s);
                    runSearch(s);
                    Haptics.selectionAsync();
                  }}
                >
                  <Text style={styles.chipText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {showHistorySection && (
          <View style={styles.historySection}>
            <Text style={[styles.historyTitle, { color: colors.textMuted }]}>{t('recentSearches')}</Text>
            {searchHistory.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.historyItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setSearchText(item);
                  runSearch(item);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.historyText, { color: colors.text }]} numberOfLines={1}>
                  {item}
                </Text>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    removeFromHistory(item);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {hasSearched && filteredResults.length > 0 && (
          <FlatList
            data={filteredResults}
            keyExtractor={(item, i) => `${item.book}-${item.chapter}-${item.verse}-${i}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => onResultPress(item)}
                activeOpacity={0.7}
              >
                <View style={styles.resultBar} />
                <View style={styles.resultContent}>
                  <Text style={styles.resultRef}>
                    {item.book} {item.chapter}:{item.verse}
                  </Text>
                  {renderHighlightedText(item.text, searchText.trim())}
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          />
        )}

        {showNoResults && (
          <View style={styles.emptySearch}>
            <Ionicons name="search-outline" size={40} color="rgba(196,149,80,0.25)" />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('noResults')}</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
              "{searchText.trim()}" için eşleşme yok. Farklı kelimeler deneyin.
            </Text>
            <View style={styles.suggestionsWrap}>
              {SUGGESTIONS.slice(0, 6).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.chip}
                  onPress={() => {
                    setSearchText(s);
                    runSearch(s);
                    Haptics.selectionAsync();
                  }}
                >
                  <Text style={styles.chipText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      <Modal visible={showFilter} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilter(false)}
        >
          <TouchableOpacity
            style={[styles.filterModal, { backgroundColor: colors.surface }]}
            activeOpacity={1}
            onPress={() => {}}
          >
            <Text style={[styles.filterModalTitle, { color: colors.text }]}>Filtrele</Text>
            {FILTER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt ?? 'all'}
                style={[
                  styles.filterOption,
                  (opt === null ? filterBook == null : filterBook === opt) && {
                    backgroundColor: 'rgba(196,149,80,0.15)',
                  },
                ]}
                onPress={() => {
                  setFilterBook(opt);
                  setShowFilter(false);
                }}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    { color: (opt === null ? filterBook == null : filterBook === opt) ? '#C4956A' : colors.text },
                  ]}
                >
                  {opt ?? t('filterAll')}
                </Text>
                {(opt === null ? filterBook == null : filterBook === opt) && (
                  <Ionicons name="checkmark" size={18} color="#C4956A" />
                )}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.regular,
    padding: 12,
  },
  clearBtn: { padding: 4 },
  resultsMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  resultsCount: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(196,149,80,0.3)',
  },
  filterText: {
    fontSize: 12,
    color: '#C4956A',
    fontFamily: fonts.regular,
  },
  suggestionsSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
  },
  suggestionsTitle: {
    fontSize: 11,
    letterSpacing: 0.2,
    marginBottom: 14,
    fontFamily: fonts.regular,
  },
  suggestionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: 'rgba(196,149,80,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(196,149,80,0.25)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 15,
    fontStyle: 'italic',
    color: '#C4956A',
    fontFamily: fonts.italic,
  },
  historySection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  historyTitle: {
    fontSize: 11,
    letterSpacing: 0.2,
    marginBottom: 14,
    fontFamily: fonts.regular,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  historyText: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.regular,
  },
  resultItem: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(196,149,80,0.1)',
  },
  resultBar: {
    width: 2,
    borderRadius: 1,
    backgroundColor: '#C4956A',
    alignSelf: 'stretch',
  },
  resultContent: { flex: 1 },
  resultRef: {
    fontSize: 11,
    color: '#C4956A',
    letterSpacing: 0.1,
    marginBottom: 6,
    fontFamily: fonts.medium,
  },
  resultText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: fonts.italic,
    fontStyle: 'italic',
  },
  resultHighlight: {
    backgroundColor: 'rgba(196,149,80,0.2)',
    color: '#C4956A',
    fontFamily: fonts.medium,
    fontStyle: 'normal',
  },
  listContent: { paddingBottom: 32 },
  emptySearch: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: fonts.regular,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
    fontFamily: fonts.italic,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModal: {
    width: '80%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 20,
  },
  filterModalTitle: {
    fontFamily: fonts.medium,
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
  },
  filterOptionText: {
    fontFamily: fonts.regular,
    fontSize: 16,
  },
});
