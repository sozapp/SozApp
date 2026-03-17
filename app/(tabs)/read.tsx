import { sampleChapter } from '@/constants/bible';
import { colors, fonts } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
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
import { useRouter } from 'expo-router';
import type { Verse } from '@/constants/bible';

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

export default function ReadScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const [fontSize, setFontSize] = useState(18);
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [highlights, setHighlights] = useState<Highlights>({});
  const [notes, setNotes] = useState<Notes>({});
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const router = useRouter();

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

  const handleLongPress = (verse: Verse) => {
    setSelectedVerse(verse);
    setShowColorPicker(false);
    setShowNoteInput(false);
    const id = getVerseId(sampleChapter.book, sampleChapter.chapterNumber, verse.number);
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
    const id = getVerseId(sampleChapter.book, sampleChapter.chapterNumber, selectedVerse.number);
    const next = { ...highlights, [id]: color };
    saveHighlights(next);
    setShowColorPicker(false);
  };

  const handleSaveNote = () => {
    if (!selectedVerse) return;
    const id = getVerseId(sampleChapter.book, sampleChapter.chapterNumber, selectedVerse.number);
    const trimmed = noteDraft.trim();
    const next = trimmed ? { ...notes, [id]: trimmed } : { ...notes };
    if (!trimmed) delete next[id];
    saveNotes(next);
    setShowNoteInput(false);
    setNoteDraft('');
  };

  const handleShare = () => {
    if (!selectedVerse) return;
    const book = sampleChapter.book;
    const ch = sampleChapter.chapterNumber;
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

  const renderVerse = ({ item }: { item: Verse }) => {
    const verseId = getVerseId(sampleChapter.book, sampleChapter.chapterNumber, item.number);
    const highlightColor = highlights[verseId];
    const hasNote = Boolean(notes[verseId]);
    const isSelected = selectedVerse?.number === item.number;

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
      </Pressable>
    );
  };

  const selectedVerseId = selectedVerse
    ? getVerseId(sampleChapter.book, sampleChapter.chapterNumber, selectedVerse.number)
    : null;
  const selectedHighlight = selectedVerseId ? highlights[selectedVerseId] : undefined;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: colors.accentBorder }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {sampleChapter.book} · {sampleChapter.chapterNumber}. Bölüm
        </Text>
        <View style={styles.fontControls}>
          <Pressable onPress={decreaseFont} style={styles.fontBtn} hitSlop={8}>
            <Text style={[styles.fontBtnText, { color: theme.text }]}>A−</Text>
          </Pressable>
          <Pressable onPress={increaseFont} style={styles.fontBtn} hitSlop={8}>
            <Text style={[styles.fontBtnText, { color: theme.text }]}>A+</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={sampleChapter.verses}
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
  headerTitle: {
    fontFamily: fonts.medium,
    fontSize: 18,
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
    paddingVertical: 10,
    marginBottom: 4,
    alignItems: 'flex-start',
    paddingHorizontal: 6,
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
  },
  noteIcon: {
    fontSize: 12,
  },
  verseText: {
    fontFamily: fonts.regular,
    flex: 1,
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
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: colors.accent,
  },
});
