import { colors, fonts } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const POLICY_TEXT = `Söz uygulaması hiçbir kişisel veriyi toplamaz veya üçüncü taraflarla paylaşmaz. Tüm notlar ve vurgular yalnızca cihazınızda saklanır. Uygulama internet bağlantısı gerektirmez.`;

export default function PrivacyPolicyScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Text style={[styles.backLabel, { color: colors.accent }]}>← Geri</Text>
        </Pressable>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: theme.text }]}>Gizlilik Politikası</Text>
        <Text style={[styles.body, { color: theme.text }]}>{POLICY_TEXT}</Text>
      </ScrollView>
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
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.accentBorder,
  },
  backBtn: {
    padding: 4,
  },
  backLabel: {
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: 40,
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: 28,
    marginBottom: 24,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 17,
    lineHeight: 28,
  },
});
