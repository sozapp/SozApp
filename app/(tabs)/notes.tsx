import {
  getVerseRefFromVerseId,
  getVerseTextByVerseId,
} from '@/constants/bible';
import { colors, fonts } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const STORAGE_NOTES = '@soz/notes';
const STORAGE_HIGHLIGHTS = '@soz/highlights';

type NotesMap = Record<string, string>;
type HighlightsMap = Record<string, string>;

export default function NotesScreen() {
  // 1. Tüm hook'lar — herhangi bir return veya if'ten ÖNCE
  const colorScheme = useColorScheme();
  const [activeTab, setActiveTab] = useState<'notes' | 'highlights'>('notes');
  const [notes, setNotes] = useState<NotesMap>({});
  const [highlights, setHighlights] = useState<HighlightsMap>({});

  const loadData = useCallback(async () => {
    try {
      const n = await AsyncStorage.getItem(STORAGE_NOTES);
      const h = await AsyncStorage.getItem(STORAGE_HIGHLIGHTS);
      if (n != null) setNotes(JSON.parse(n) as NotesMap);
      else setNotes({});
      if (h != null) setHighlights(JSON.parse(h) as HighlightsMap);
      else setHighlights({});
    } catch (_) {
      setNotes({});
      setHighlights({});
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleDeleteNote = useCallback(
    async (verseId: string) => {
      const next = { ...notes };
      delete next[verseId];
      setNotes(next);
      try {
        await AsyncStorage.setItem(STORAGE_NOTES, JSON.stringify(next));
      } catch (_) {}
    },
    [notes]
  );

  // 2. Hook'tan türetilen değişkenler
  const isDark = colorScheme === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const noteEntries = Object.entries(notes);
  const highlightEntries = Object.entries(highlights);

  // 3. Return — en sonda
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Notlarım</Text>
      </View>

      <View style={[styles.tabRow, { borderBottomColor: theme.textMuted }]}>
        <Pressable
          style={styles.tab}
          onPress={() => setActiveTab('notes')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'notes' ? { color: colors.accent } : { color: theme.textMuted },
            ]}
          >
            Notlar
          </Text>
          {activeTab === 'notes' && <View style={[styles.tabUnderline, { backgroundColor: colors.accent }]} />}
        </Pressable>
        <Pressable
          style={styles.tab}
          onPress={() => setActiveTab('highlights')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'highlights' ? { color: colors.accent } : { color: theme.textMuted },
            ]}
          >
            Vurgular
          </Text>
          {activeTab === 'highlights' && <View style={[styles.tabUnderline, { backgroundColor: colors.accent }]} />}
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          (activeTab === 'notes' ? noteEntries : highlightEntries).length === 0 && styles.scrollContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'notes' && (
          <>
            {noteEntries.length === 0 ? (
              <Text style={[styles.placeholder, { color: theme.textMuted }]}>
                Henüz not eklemediniz
              </Text>
            ) : (
              noteEntries.map(([verseId, noteText]) => {
                const refStr = getVerseRefFromVerseId(verseId);
                const verseText = getVerseTextByVerseId(verseId);
                return (
                  <View
                    key={verseId}
                    style={[styles.noteCard, { backgroundColor: theme.surface }]}
                  >
                    <View style={styles.noteCardHeader}>
                      <Text style={[styles.verseRef, { color: colors.accent }]}>
                        {refStr}
                      </Text>
                      <Pressable
                        onPress={() => handleDeleteNote(verseId)}
                        style={styles.deleteBtn}
                        hitSlop={12}
                      >
                        <Text style={[styles.deleteBtnText, { color: theme.textMuted }]}>×</Text>
                      </Pressable>
                    </View>
                    <Text
                      style={[styles.verseText, { color: theme.text }]}
                      numberOfLines={2}
                    >
                      {verseText ?? ''}
                    </Text>
                    <View style={[styles.divider, { backgroundColor: theme.textMuted }]} />
                    <Text style={[styles.noteText, { color: theme.text }]} numberOfLines={3}>
                      {noteText}
                    </Text>
                  </View>
                );
              })
            )}
          </>
        )}

        {activeTab === 'highlights' && (
          <>
            {highlightEntries.length === 0 ? (
              <Text style={[styles.placeholder, { color: theme.textMuted }]}>
                Henüz vurgulama yapmadınız
              </Text>
            ) : (
              highlightEntries.map(([verseId, colorHex]) => {
                const refStr = getVerseRefFromVerseId(verseId);
                const verseText = getVerseTextByVerseId(verseId);
                return (
                  <View
                    key={verseId}
                    style={[
                      styles.highlightCard,
                      {
                        backgroundColor: theme.surface,
                        borderLeftColor: colorHex,
                      },
                    ]}
                  >
                    <Text style={[styles.verseRef, { color: colors.accent }]}>
                      {refStr}
                    </Text>
                    <Text
                      style={[styles.verseText, { color: theme.text }]}
                      numberOfLines={2}
                    >
                      {verseText ?? ''}
                    </Text>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontFamily: fonts.thin,
    fontSize: 32,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 20,
  },
  tab: {
    paddingVertical: 12,
    marginRight: 32,
  },
  tabText: {
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  scrollContentEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    fontFamily: fonts.italic,
    fontSize: 16,
  },
  noteCard: {
    borderRadius: 10,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  noteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  verseRef: {
    fontFamily: fonts.regular,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  deleteBtn: {
    padding: 4,
  },
  deleteBtnText: {
    fontSize: 22,
    lineHeight: 24,
  },
  verseText: {
    fontFamily: fonts.italic,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  noteText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  highlightCard: {
    borderRadius: 10,
    borderLeftWidth: 3,
    padding: 16,
    marginBottom: 14,
  },
});
