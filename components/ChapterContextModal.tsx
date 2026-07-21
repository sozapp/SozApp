import { getRelatedVideo, getVideoThumbnailUrl, openVideo } from '@/constants/videos';
import type { ContextNote } from '@/constants/context-note-types';
import { fonts } from '@/constants/theme';
import { useTranslation } from '@/context/LanguageContext';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

const CHAPTER_NAV_COLOR = '#C4956A';

type Props = {
  visible: boolean;
  onClose: () => void;
  contextNote: ContextNote | null | undefined;
  bookId: string;
  bookName: string;
  chapterNumber: number;
};

/** Bölüm bağlamı bilgi sayfası — read.tsx'in "i" (bağlam) butonuyla açılır. */
export function ChapterContextModal({
  visible,
  onClose,
  contextNote,
  bookId,
  bookName,
  chapterNumber,
}: Props) {
  const { theme } = useTheme();
  const { t: tx } = useTranslation();
  const haptics = useHaptics();
  const router = useRouter();

  const relatedVideo = contextNote ? getRelatedVideo(bookId, chapterNumber) : null;

  const askSozQuestions = [
    `${bookName} ${chapterNumber} kim yazdı?`,
    'Bu bölümün ana mesajı nedir?',
    'Bu dönemde neler yaşanıyordu?',
  ];

  const goAskSoz = (prefill: string) => {
    onClose();
    setTimeout(() => {
      router.push({ pathname: '/ask', params: { prefill } });
    }, 300);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.contextBackdrop} onPress={onClose}>
        <Pressable
          style={[styles.contextModalContent, { backgroundColor: theme.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          {contextNote != null && (
            <>
              <View style={[styles.contextHandle, { backgroundColor: theme.textMuted }]} />
              <Pressable style={styles.contextModalClose} onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
              <ScrollView style={styles.contextScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.contextChapterLabel}>
                  {bookName} · {chapterNumber}. Bölüm
                </Text>
                <Text style={[styles.contextModalTitle, { color: theme.text }]}>
                  {contextNote.title}
                </Text>
                <Text style={[styles.contextSectionLabel, { color: theme.textMuted }]}>
                  {tx('inThisChapter').toUpperCase()}
                </Text>
                <Text style={[styles.contextSummary, { color: theme.text }]}>
                  {contextNote.summary}
                </Text>
                <View style={[styles.contextDivider, { backgroundColor: theme.textMuted }]} />
                <Text style={[styles.contextSectionLabel, { color: theme.textMuted }]}>
                  {tx('historicalContext').toUpperCase()}
                </Text>
                <Text style={[styles.contextHistorical, { color: theme.textMuted }]}>
                  {contextNote.historicalContext}
                </Text>
                <View style={[styles.contextDivider, { backgroundColor: theme.textMuted }]} />
                <Text style={[styles.contextSectionLabel, { color: theme.textMuted }]}>
                  {tx('keyVerse').toUpperCase()}
                </Text>
                <View style={styles.contextKeyVerseWrap}>
                  <Text style={styles.contextKeyVerse}>{contextNote.keyVerse}</Text>
                  {contextNote.keyQuote ? (
                    <Text style={[styles.contextKeyQuote, { color: theme.textMuted }]}>
                      «{contextNote.keyQuote}»
                    </Text>
                  ) : null}
                </View>

                {relatedVideo && (
                  <>
                    <View style={[styles.contextDivider, { backgroundColor: theme.textMuted }]} />
                    <Text style={[styles.contextSectionLabel, { color: theme.textMuted }]}>
                      İLGİLİ VİDEO
                    </Text>
                    <Pressable
                      style={[styles.contextVideoCard, { backgroundColor: theme.background }]}
                      onPress={() => {
                        try {
                          openVideo(relatedVideo.youtubeId);
                        } catch {
                          /* ignore */
                        }
                      }}
                    >
                      <Image
                        source={{ uri: getVideoThumbnailUrl(relatedVideo.youtubeId) }}
                        style={styles.contextVideoThumb}
                        resizeMode="cover"
                      />
                      <View style={styles.contextVideoBody}>
                        <Text
                          style={[styles.contextVideoTitle, { color: theme.text }]}
                          numberOfLines={2}
                        >
                          {relatedVideo.title}
                        </Text>
                        {relatedVideo.bibleRef != null ? (
                          <Text style={[styles.contextVideoRef, { color: CHAPTER_NAV_COLOR }]}>
                            {relatedVideo.bibleRef}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons name="play-circle" size={28} color={CHAPTER_NAV_COLOR} />
                    </Pressable>
                  </>
                )}

                {/* Söz'e Sor bölümü */}
                <View style={styles.askSozSection}>
                  <View style={styles.askSozDivider} />
                  <Text style={styles.askSozLabel}>DAHA FAZLASINI KEŞFET</Text>
                  <TouchableOpacity
                    style={styles.askSozBtn}
                    onPress={() => {
                      goAskSoz(
                        `${bookName} ${chapterNumber}. bölümü hakkında daha fazla bilgi ver. ` +
                          `Tarihsel bağlamı, yazarı ve ana mesajı açıkla.`
                      );
                      haptics.medium();
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.askSozIconWrap}>
                      <Svg width={18} height={18} viewBox="0 0 40 40" fill="none">
                        <Line x1="13" y1="11" x2="27" y2="11" stroke="#0A0A08" strokeWidth="2.5" strokeLinecap="round" />
                        <Path
                          d="M27 11C27 11 13 11 13 20C13 29 27 29 27 29"
                          stroke="#0A0A08"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          fill="none"
                        />
                        <Line x1="13" y1="29" x2="27" y2="29" stroke="#0A0A08" strokeWidth="2.5" strokeLinecap="round" />
                        <Circle cx="20" cy="20" r="2.5" fill="#0A0A08" />
                      </Svg>
                    </View>
                    <View style={styles.askSozTextWrap}>
                      <Text style={styles.askSozBtnTitle}>Söz'e Sor</Text>
                      <Text style={styles.askSozBtnDesc}>Bu bölüm hakkında daha derin sorular sor</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#0A0A08" style={{ opacity: 0.7 }} />
                  </TouchableOpacity>

                  <View style={styles.quickQuestionsWrap}>
                    {askSozQuestions.map((question, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.quickQuestionChip,
                          { borderColor: 'rgba(196,149,80,0.35)', backgroundColor: 'rgba(196,149,80,0.05)' },
                        ]}
                        onPress={() => {
                          goAskSoz(question);
                          haptics.light();
                        }}
                      >
                        <Text style={[styles.quickQuestionText, { color: theme.text }]}>{question}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  contextBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  contextModalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  contextHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
    alignSelf: 'center',
  },
  contextModalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 4,
  },
  contextScroll: {
    paddingRight: 24,
    paddingBottom: 24,
  },
  contextChapterLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: CHAPTER_NAV_COLOR,
    letterSpacing: 0.15 * 13,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  contextModalTitle: {
    fontFamily: fonts.medium,
    fontSize: 22,
    marginBottom: 16,
    paddingRight: 32,
  },
  contextSectionLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    letterSpacing: 0.2 * 10,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 4,
  },
  contextSummary: {
    fontFamily: fonts.italic,
    fontSize: 15,
    lineHeight: 15 * 1.7,
  },
  contextDivider: {
    height: 0.5,
    marginVertical: 16,
  },
  contextHistorical: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  contextKeyVerseWrap: {
    borderWidth: 1,
    borderColor: CHAPTER_NAV_COLOR,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  contextKeyVerse: {
    fontFamily: fonts.italic,
    fontSize: 15,
    color: CHAPTER_NAV_COLOR,
  },
  contextKeyQuote: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  contextVideoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(196,149,80,0.25)',
    marginTop: 8,
  },
  contextVideoThumb: {
    width: 120,
    height: 68,
    backgroundColor: '#1a1612',
  },
  contextVideoBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  contextVideoTitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  contextVideoRef: {
    fontFamily: fonts.medium,
    fontSize: 12,
    marginTop: 4,
  },
  askSozSection: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  askSozDivider: {
    height: 0.5,
    backgroundColor: 'rgba(196,149,80,0.2)',
    marginVertical: 20,
  },
  askSozLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
    color: 'rgba(196,149,80,0.7)',
    fontFamily: fonts.regular,
    marginBottom: 12,
  },
  askSozBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#C4956A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  askSozIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  askSozTextWrap: {
    flex: 1,
  },
  askSozBtnTitle: {
    fontSize: 15,
    color: '#0A0A08',
    fontFamily: fonts.medium,
    letterSpacing: 0.02,
  },
  askSozBtnDesc: {
    fontSize: 12,
    color: 'rgba(10,10,8,0.65)',
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  quickQuestionsWrap: {
    gap: 8,
  },
  quickQuestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 0.5,
  },
  quickQuestionText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    fontStyle: 'italic',
    flex: 1,
  },
});
