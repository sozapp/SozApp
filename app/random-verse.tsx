import ShareVerseModal from '@/components/ShareVerseModal';
import { pickRandomVerseForShare } from '@/constants/bibleVersions';
import { useTheme } from '@/hooks/useTheme';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

const ACCENT = '#C4956A';

/** Home Screen Quick Action "Rastgele Ayet" — explore'daki pickRandomVerseForShare akışı. */
export default function RandomVerseScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [verse, setVerse] = useState<{
    text: string;
    ref: string;
    bookId: string;
    chapter: number;
    verse: number;
  } | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const r = pickRandomVerseForShare();
    if (r) {
      setVerse({
        text: r.verseText,
        ref: r.verseRef,
        bookId: r.bookId,
        chapter: r.chapter,
        verse: r.verse,
      });
      setModalVisible(true);
    } else {
      router.replace('/(tabs)/explore' as never);
    }
  }, [router]);

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]}>
      {!modalVisible ? <ActivityIndicator color={ACCENT} /> : null}
      <ShareVerseModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          router.replace('/(tabs)/explore' as never);
        }}
        verseText={verse?.text ?? ''}
        verseRef={verse?.ref ?? ''}
        deepLinkParams={
          verse?.bookId
            ? { bookId: verse.bookId, chapter: verse.chapter, verse: verse.verse }
            : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
