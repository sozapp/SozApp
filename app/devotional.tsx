import { getTodaysDevotional } from '@/constants/devotionals';
import { fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ACCENT = '#C4956A';

export default function DevotionalScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const devotional = useMemo(() => getTodaysDevotional(today), [today]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={ACCENT} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Günlük Yansıma</Text>
        <View style={styles.backBtn} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: theme.text }]}>{devotional.title}</Text>
        <Text style={[styles.verse, { color: ACCENT }]}>{devotional.verse}</Text>
        <Text style={[styles.verseRef, { color: theme.textMuted }]}>{devotional.verseRef}</Text>
        <Text style={[styles.reflection, { color: theme.text }]}>{devotional.reflection}</Text>
        <View style={[styles.questionCard, { backgroundColor: theme.surface, borderColor: theme.borderStrong }]}>
          <Text style={[styles.questionLabel, { color: theme.textMuted }]}>DÜŞÜNCE SORUSU</Text>
          <Text style={[styles.questionText, { color: theme.text }]}>{devotional.question}</Text>
        </View>
        <View style={[styles.prayerCard, { backgroundColor: theme.surface, borderColor: theme.borderStrong }]}>
          <Text style={[styles.prayerLabel, { color: theme.textMuted }]}>{t('prayer')}</Text>
          <Text style={[styles.prayerText, { color: theme.text }]}>{devotional.prayer}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(196,149,80,0.2)',
  },
  backBtn: { padding: 4, minWidth: 32 },
  headerTitle: {
    fontFamily: fonts.medium,
    fontSize: 18,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: 22,
    marginBottom: 16,
  },
  verse: {
    fontFamily: fonts.italic,
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 8,
  },
  verseRef: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginBottom: 16,
  },
  reflection: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 16,
  },
  questionCard: {
    borderRadius: 12,
    borderWidth: 0.5,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
  },
  questionLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  questionText: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 26,
  },
  prayerCard: {
    borderRadius: 12,
    borderWidth: 0.5,
    padding: 16,
  },
  prayerLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  prayerText: {
    fontFamily: fonts.italic,
    fontSize: 15,
    lineHeight: 24,
  },
});
