import { newTestament } from '@/constants/new-testament';
import { bookList, getBookIndex } from '@/constants/bible-index';
import { sampleChapter1878 } from '@/constants/bible-1878';
import { FREE_LIMITS } from '@/constants/premium';
import { colors, fonts } from '@/constants/theme';
import { usePremium } from '@/hooks/usePremium';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

type VerseItem = { number: number; text: string };

const MIN_FONT_SIZE = 16;
const MAX_FONT_SIZE = 22;

const HIGHLIGHT_COLORS = ['#F5E642', '#86EFAC', '#93C5FD', '#F9A8D4'] as const;
const STORAGE_HIGHLIGHTS = '@soz/highlights';
const STORAGE_NOTES = '@soz/notes';

type Highlights = { [verseId: string]: string };
type Notes = { [verseId: string]: string };

function getVerseId(book: string, chapterNumber: number, verseNumber: number): string {
  return `${book}-${chapterNumber}-${verseNumber}`;
}

const CHAPTER_NAV_COLOR = '#C4956A';

const DEFAULT_BOOK_INDEX = 3; // Yuhanna

export default function ReadScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const [bookIndex, setBookIndex] = useState(DEFAULT_BOOK_INDEX);
  const [chapterIndexInBook, setChapterIndexInBook] = useState(0);
  const [bookPickerVisible, setBookPickerVisible] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [selectedVerse, setSelectedVerse] = useState<VerseItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [highlights, setHighlights] = useState<Highlights>({});
  const [notes, setNotes] = useState<Notes>({});
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const { isPremium } = usePremium();
  const router = useRouter();
  const params = useLocalSearchParams<{ bookId?: string; chapter?: string }>();
  const flatListRef = useRef<FlatList>(null);

  const currentBook = newTestament[bookIndex];
  const currentChapterData = currentBook.chapters[chapterIndexInBook];
  const chapter = {
    book: currentBook.name,
    chapterNumber: currentChapterData.chapter,
    verses: currentChapterData.verses.map((v) => ({ number: v.verse, text: v.text })),
  };
  const isFirstChapter = bookIndex === 0 && chapterIndexInBook === 0;
  const isLastChapter =
    bookIndex === newTestament.length - 1 &&
    chapterIndexInBook === currentBook.chapters.length - 1;

  useEffect(() => {
    const { bookId, chapter: chapterParam } = params;
    if (bookId != null) {
      const bIdx = getBookIndex(bookId);
      if (bIdx >= 0) {
        setBookIndex(bIdx);
        if (chapterParam != null) {
          const ch = parseInt(chapterParam, 10);
          if (!Number.isNaN(ch) && ch >= 1 && ch <= newTestament[bIdx].chapters.length) {
            setChapterIndexInBook(ch - 1);
          } else {
            setChapterIndexInBook(0);
          }
        } else {
          setChapterIndexInBook(0);
        }
      }
    }
  }, [params.bookId, params.chapter]);

  const loadStored = useCallback(async () => {
    try {
      const [hRaw, nRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_HIGHLIGHTS),
        AsyncStorage.getItem(STORAGE_NOTES),
      ]);
      if (hRaw != null) {
        const parsed = JSON.parse(hRaw) as Highlights;
        setHighlights(parsed);
      }
      if (nRaw != null) {
        const parsed = JSON.parse(nRaw) as Notes;
        setNotes(parsed);
      }
    } catch (_) {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadStored();
  }, [loadStored]);

  useEffect(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [bookIndex, chapterIndexInBook]);

  const goPrevChapter = () => {
    if (chapterIndexInBook > 0) {
      setChapterIndexInBook((c) => c - 1);
    } else if (bookIndex > 0) {
      setBookIndex((b) => b - 1);
      setChapterIndexInBook(newTestament[bookIndex - 1].chapters.length - 1);
    }
  };

  const goNextChapter = () => {
    if (chapterIndexInBook < currentBook.chapters.length - 1) {
      setChapterIndexInBook((c) => c + 1);
    } else if (bookIndex < newTestament.length - 1) {
      setBookIndex((b) => b + 1);
      setChapterIndexInBook(0);
    }
  };

  const handleLongPress = (verse: VerseItem) => {
    setSelectedVerse(verse);
    setShowColorPicker(false);
    setShowNoteInput(false);
    const id = getVerseId(chapter.book, chapter.chapterNumber, verse.number);
    setNoteDraft(notes[id] ?? '');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedVerse(null);
    setShowColorPicker(false);
    setShowNoteInput(false);
    setNoteDraft('');
  };

  const saveHighlights = useCallback(async (next: Highlights) => {
    setHighlights(next);
    try {
      await AsyncStorage.setItem(STORAGE_HIGHLIGHTS, JSON.stringify(next));
    } catch (_) {
      // ignore
    }
  }, []);

  const saveNotes = useCallback(async (next: Notes) => {
    setNotes(next);
    try {
      await AsyncStorage.setItem(STORAGE_NOTES, JSON.stringify(next));
    } catch (_) {
      // ignore
    }
  }, []);

  const handleHighlightColor = (color: string) => {
    if (!selectedVerse) return;
    const id = getVerseId(chapter.book, chapter.chapterNumber, selectedVerse.number);
    const next = { ...highlights, [id]: color };
    saveHighlights(next);
    setShowColorPicker(false);
  };

  const handleSaveNote = () => {
    if (!selectedVerse) return;
    const id = getVerseId(chapter.book, chapter.chapterNumber, selectedVerse.number);
    const trimmed = noteDraft.trim();
    const isNewNote = !(id in notes) && Boolean(trimmed);
    if (!isPremium && isNewNote && Object.keys(notes).length >= FREE_LIMITS.notesLimit) {
      router.push('/paywall');
      return;
    }
    const next = trimmed ? { ...notes, [id]: trimmed } : { ...notes };
    if (!trimmed) delete next[id];
    saveNotes(next);
    setShowNoteInput(false);
    setNoteDraft('');
  };

  const handleShare = () => {
    if (!selectedVerse) return;
    const book = chapter.book;
    const ch = chapter.chapterNumber;
    const num = selectedVerse.number;
    closeModal();
    router.push({
      pathname: '/(tabs)/share-card',
      params: {
        verseId: getVerseId(book, ch, num),
        text: selectedVerse.text,
        ref: `${book} ${ch}:${num}`,
      },
    });
  };

  const decreaseFont = () => setFontSize((s) => Math.max(MIN_FONT_SIZE, s - 2));
  const increaseFont = () => setFontSize((s) => Math.min(MAX_FONT_SIZE, s + 2));

  const showCompare = compareMode && currentBook.id === 'joh' && chapter.chapterNumber === 3;
  const getVerse1878 = useCallback((verseNumber: number) => {
    return sampleChapter1878.verses.find((v) => v.number === verseNumber)?.text ?? null;
  }, []);

  const renderVerse = ({ item }: { item: VerseItem }) => {
    const verseId = getVerseId(chapter.book, chapter.chapterNumber, item.number);
    const highlightColor = highlights[verseId];
    const hasNote = Boolean(notes[verseId]);
    const isSelected = selectedVerse?.number === item.number;
    const text1878 = showCompare ? getVerse1878(item.number) : null;

    return (
      <Pressable
        style={[
          styles.verseRow,
          highlightColor != null && { backgroundColor: highlightColor },
          isSelected && styles.verseRowSelected,
        ]}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={400}
      >
        <View style={styles.verseNumberRow}>
          <Text style={styles.verseNumber}>{item.number}</Text>
          {hasNote && <Text style={styles.noteIcon}>📝</Text>}
        </View>
        <View style={styles.verseTextBlock}>
          <Text
            style={[
              styles.verseText,
              {
                color: theme.text,
                fontSize,
                lineHeight: fontSize * 1.8,
              },
            ]}
          >
            {item.text}
          </Text>
          {text1878 != null && (
            <>
              <View style={styles.compareDivider} />
              <Text
                style={[
                  styles.verseText1878,
                  { color: theme.textMuted },
                ]}
              >
                {text1878}
              </Text>
            </>
          )}
        </View>
      </Pressable>
    );
  };

  const selectedVerseId = selectedVerse
    ? getVerseId(chapter.book, chapter.chapterNumber, selectedVerse.number)
    : null;
  const selectedHighlight = selectedVerseId ? highlights[selectedVerseId] : undefined;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: colors.accentBorder }]}>
        <View style={styles.headerLeft}>
          <Pressable
            onPress={goPrevChapter}
            disabled={isFirstChapter}
            style={[styles.chapterNavBtn, isFirstChapter && styles.chapterNavBtnDisabled]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={24} color={CHAPTER_NAV_COLOR} />
          </Pressable>
          <Pressable
            style={styles.headerTitleBlock}
            onPress={() => setBookPickerVisible(true)}
          >
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {currentBook.name} · {chapterIndexInBook + 1}. Bölüm
            </Text>
            <Text
              style={[
                styles.headerTranslationLabel,
                compareMode ? { color: CHAPTER_NAV_COLOR } : { color: theme.textMuted },
              ]}
            >
              {compareMode ? '2001 · 1878 Karşılaştırma' : 'Kutsal Kitap 2001'}
            </Text>
          </Pressable>
          <Pressable
            onPress={goNextChapter}
            disabled={isLastChapter}
            style={[styles.chapterNavBtn, isLastChapter && styles.chapterNavBtnDisabled]}
            hitSlop={8}
          >
            <Ionicons name="chevron-forward" size={24} color={CHAPTER_NAV_COLOR} />
          </Pressable>
        </View>
        <View style={styles.fontControls}>
          <Pressable onPress={() => router.push('/search')} style={styles.compareBtn} hitSlop={8}>
            <Ionicons name="search" size={22} color={theme.textMuted} />
          </Pressable>
          <Pressable
            onPress={() => setCompareMode((c) => !c)}
            style={styles.compareBtn}
            hitSlop={8}
          >
            <Ionicons
              name="swap-horizontal"
              size={22}
              color={compareMode ? CHAPTER_NAV_COLOR : theme.textMuted}
            />
          </Pressable>
          <Pressable onPress={decreaseFont} style={styles.fontBtn} hitSlop={8}>
            <Text style={[styles.fontBtnText, { color: theme.text }]}>A−</Text>
          </Pressable>
          <Pressable onPress={increaseFont} style={styles.fontBtn} hitSlop={8}>
            <Text style={[styles.fontBtnText, { color: theme.text }]}>A+</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={chapter.verses}
        keyExtractor={(item) => String(item.number)}
        renderItem={renderVerse}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: theme.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedVerse && (
              <>
                <Text style={[styles.modalVerse, { color: theme.text }]}>
                  {selectedVerse.number}. {selectedVerse.text}
                </Text>

                {showNoteInput ? (
                  <View style={styles.noteInputSection}>
                    <TextInput
                      style={[styles.noteInput, { backgroundColor: theme.background, color: theme.text }]}
                      placeholder="Notunuzu yazın..."
                      placeholderTextColor={theme.textMuted}
                      value={noteDraft}
                      onChangeText={setNoteDraft}
                      multiline
                      numberOfLines={3}
                    />
                    <View style={styles.noteInputActions}>
                      <Pressable
                        style={[styles.noteInputBtn, { backgroundColor: theme.textMuted }]}
                        onPress={() => { setShowNoteInput(false); setNoteDraft(notes[selectedVerseId ?? ''] ?? ''); }}
                      >
                        <Text style={[styles.modalBtnText, { color: theme.text }]}>İptal</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.noteInputBtn, { backgroundColor: colors.accent }]}
                        onPress={handleSaveNote}
                      >
                        <Text style={[styles.modalBtnText, { color: colors.white }]}>Kaydet</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : showColorPicker ? (
                  <View style={styles.colorPickerSection}>
                    <Text style={[styles.colorPickerLabel, { color: theme.textMuted }]}>Renk seçin</Text>
                    <View style={styles.colorPickerRow}>
                      {HIGHLIGHT_COLORS.map((color) => (
                        <Pressable
                          key={color}
                          style={[
                            styles.colorCircle,
                            { backgroundColor: color },
                            selectedHighlight === color && styles.colorCircleSelected,
                          ]}
                          onPress={() => handleHighlightColor(color)}
                        />
                      ))}
                    </View>
                  </View>
                ) : (
                  <View style={styles.modalActions}>
                    <Pressable
                      style={[styles.modalBtn, styles.modalBtnSurface, { backgroundColor: theme.surface }]}
                      onPress={() => { setShowNoteInput(true); setShowColorPicker(false); }}
                    >
                      <Ionicons name="create-outline" size={20} color={theme.text} />
                      <Text style={[styles.modalBtnText, { color: theme.text }]}>Not Ekle</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.modalBtn, styles.modalBtnSurface, { backgroundColor: theme.surface }]}
                      onPress={() => { setShowColorPicker(true); setShowNoteInput(false); }}
                    >
                      <Ionicons name="brush-outline" size={20} color={theme.text} />
                      <Text style={[styles.modalBtnText, { color: theme.text }]}>Vurgula</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.modalBtn, styles.modalBtnAccent]}
                      onPress={handleShare}
                    >
                      <Ionicons name="share-outline" size={20} color={colors.white} />
                      <Text style={[styles.modalBtnText, { color: colors.white }]}>Paylaş</Text>
                    </Pressable>
                  </View>
                )}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={bookPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBookPickerVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setBookPickerVisible(false)}
        >
          <Pressable
            style={[styles.bookPickerContent, { backgroundColor: theme.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.bookPickerTitle, { color: theme.text }]}>
              Kitap seç
            </Text>
            <FlatList
              data={bookList}
              keyExtractor={(item) => item.id}
              style={styles.bookPickerList}
              renderItem={({ item, index }) => (
                <Pressable
                  style={[
                    styles.bookPickerRow,
                    { borderBottomColor: colors.accentBorder },
                    index === bookIndex && { backgroundColor: colors.accentBadgeBg },
                  ]}
                  onPress={() => {
                    setBookIndex(index);
                    setChapterIndexInBook(0);
                    setBookPickerVisible(false);
                  }}
                >
                  <Text style={[styles.bookPickerName, { color: theme.text }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.bookPickerChapters, { color: theme.textMuted }]}>
                    {item.chapterCount} bölüm
                  </Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  chapterNavBtn: {
    padding: 4,
  },
  chapterNavBtnDisabled: {
    opacity: 0.3,
  },
  headerTitleBlock: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: fonts.medium,
    fontSize: 18,
  },
  headerTranslationLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    marginTop: 2,
  },
  compareBtn: {
    padding: 4,
    marginRight: 4,
  },
  fontControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fontBtn: {
    padding: 4,
  },
  fontBtnText: {
    fontFamily: fonts.medium,
    fontSize: 18,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  verseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
    paddingVertical: 10,
    marginBottom: 4,
    borderRadius: 6,
  },
  verseRowSelected: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  verseNumberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    minWidth: 32,
    marginRight: 8,
    gap: 4,
    paddingTop: 3,
  },
  verseNumber: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.accent,
    width: 32,
    paddingTop: 3,
    flexShrink: 0,
  },
  noteIcon: {
    fontSize: 12,
  },
  verseTextBlock: {
    flex: 1,
  },
  verseText: {
    fontFamily: fonts.regular,
    flex: 1,
    paddingRight: 16,
    lineHeight: 28,
  },
  compareDivider: {
    height: 0.5,
    backgroundColor: 'rgba(196,149,106,0.3)',
    marginVertical: 8,
  },
  verseText1878: {
    fontFamily: fonts.italic,
    fontSize: 14,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
  },
  modalVerse: {
    fontFamily: fonts.italic,
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'column',
    gap: 10,
  },
  modalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 10,
    width: '100%',
  },
  modalBtnSurface: {},
  modalBtnAccent: {
    backgroundColor: colors.accent,
  },
  modalBtnText: {
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  noteInputSection: {
    marginTop: 4,
  },
  noteInput: {
    fontFamily: fonts.regular,
    fontSize: 15,
    padding: 12,
    borderRadius: 8,
    minHeight: 80,
    marginBottom: 12,
  },
  noteInputActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  noteInputBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  colorPickerSection: {
    marginTop: 4,
  },
  colorPickerLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginBottom: 12,
  },
  colorPickerRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  bookPickerContent: {
    borderRadius: 20,
    padding: 16,
    maxHeight: '80%',
    marginHorizontal: 24,
  },
  bookPickerTitle: {
    fontFamily: fonts.medium,
    fontSize: 18,
    marginBottom: 12,
  },
  bookPickerList: {
    maxHeight: 400,
  },
  bookPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
  },
  bookPickerName: {
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  bookPickerChapters: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: colors.accent,
  },
});
