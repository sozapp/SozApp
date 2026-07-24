import { fonts } from '@/constants/theme';
import { useTranslation } from '@/context/LanguageContext';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeBack } from '@/hooks/useSafeBack';

export default function DonateScreen() {
  const safeBack = useSafeBack();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const glowAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [glowAnim]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={t('goBackA11y')}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textMuted} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('supportTitle')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Animated.View style={[styles.heroGlow, { opacity: glowAnim }]}>
            <View style={styles.heroIcon}>
              <Ionicons name="heart" size={32} color="#C4956A" />
            </View>
          </Animated.View>

          <Text style={styles.heroTitle}>
            {t('donateHeroTitleBefore')}
            <Text style={styles.heroAccent}>{t('donateHeroFaith')}</Text>
            {t('donateHeroTitleAfter')}
          </Text>

          <Text style={styles.heroDesc}>{t('donateHeroDesc1')}</Text>

          <Text style={styles.heroDesc}>
            {t('donateHeroDesc2')}{' '}
            <Text style={styles.heroEmphasis}>{t('donateHeroEmphasis')}</Text>
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('whyImportant')}</Text>

          {[
            {
              icon: 'server-outline' as const,
              title: t('donateReason1Title'),
              desc: t('donateReason1Desc'),
            },
            {
              icon: 'globe-outline' as const,
              title: t('donateReason2Title'),
              desc: t('donateReason2Desc'),
            },
            {
              icon: 'time-outline' as const,
              title: t('donateReason3Title'),
              desc: t('donateReason3Desc'),
            },
          ].map((item, i) => (
            <View key={i} style={styles.reasonCard}>
              <View style={styles.reasonIcon}>
                <Ionicons name={item.icon} size={18} color="#C4956A" />
              </View>
              <View style={styles.reasonText}>
                <Text style={styles.reasonTitle}>{item.title}</Text>
                <Text style={styles.reasonDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('bibleSaysTitle')}</Text>

          {[
            {
              ref: '2. Korintliler 9:7',
              text: '"Her biri zoraki ya da isteksizce değil, gönülden ne vermeye karar vermişse öyle versin. Çünkü Tanrı, güler yüzle veren kişiyi sever."',
            },
            {
              ref: 'Luka 21:1-4',
              text: '"Yoksul dul kadın hepsinden çok attı. Çünkü diğerleri bolluklarından arta kalanı sundular; bu kadın ise yokluğundan geçimini sağlayan her şeyini verdi."',
            },
            {
              ref: 'Matta 6:20',
              text: '"Kendinize gökte hazineler biriktirin; orada ne güve ne pas törpüler, ne de hırsızlar girip çalamaz."',
            },
          ].map((verse, i) => (
            <View key={i} style={styles.verseCard}>
              <View style={styles.verseStripe} />
              <View style={styles.verseBody}>
                <Text style={styles.verseRef}>{verse.ref}</Text>
                <Text style={styles.verseText}>{verse.text}</Text>
              </View>
            </View>
          ))}

          <View style={styles.noteCard}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="rgba(196,149,80,0.6)"
              style={{ marginTop: 1 }}
            />
            <Text style={styles.noteText}>{t('donateOptionalNote')}</Text>
          </View>
        </View>

        <View style={styles.donateSection}>
          <TouchableOpacity
            style={styles.donateBtn}
            onPress={() => void Linking.openURL('https://sozapp.com/bagis')}
            activeOpacity={0.85}
          >
            <Ionicons name="heart" size={18} color="#0A0A08" />
            <Text style={styles.donateBtnText}>{t('donate')}</Text>
          </TouchableOpacity>

          <Text style={styles.donateNote}>{t('donatePaymentNote')}</Text>

          <TouchableOpacity style={styles.skipBtn} onPress={() => safeBack()}>
            <Text style={styles.skipBtnText}>{t('notNow')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 17,
      color: colors.text,
      fontFamily: fonts.regular,
    },
    scroll: {
      paddingBottom: 48,
    },

    heroSection: {
      padding: 28,
      alignItems: 'center',
      gap: 16,
    },
    heroGlow: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: 'rgba(196,149,80,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(196,149,80,0.2)',
      marginBottom: 8,
    },
    heroIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: 'rgba(196,149,80,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroTitle: {
      fontSize: 24,
      color: colors.text,
      fontFamily: fonts.regular,
      textAlign: 'center',
      lineHeight: 34,
      letterSpacing: -0.02,
    },
    heroAccent: {
      color: '#C4956A',
      fontStyle: 'italic',
    },
    heroDesc: {
      fontSize: 15,
      color: colors.textMuted,
      fontFamily: fonts.regular,
      textAlign: 'center',
      lineHeight: 24,
      fontStyle: 'italic',
    },
    heroEmphasis: {
      color: colors.text,
      fontStyle: 'normal',
    },

    divider: {
      height: 0.5,
      backgroundColor: colors.border,
      marginHorizontal: 24,
      marginVertical: 4,
    },

    section: {
      padding: 24,
      gap: 12,
    },
    sectionLabel: {
      fontSize: 10,
      letterSpacing: 0.25,
      color: 'rgba(196,149,80,0.6)',
      fontFamily: fonts.regular,
      marginBottom: 4,
    },
    reasonCard: {
      flexDirection: 'row',
      gap: 14,
      alignItems: 'flex-start',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 0.5,
      borderColor: colors.border,
    },
    reasonIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: 'rgba(196,149,80,0.08)',
      borderWidth: 0.5,
      borderColor: 'rgba(196,149,80,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    reasonText: {
      flex: 1,
      gap: 3,
    },
    reasonTitle: {
      fontSize: 14,
      color: colors.text,
      fontFamily: fonts.regular,
    },
    reasonDesc: {
      fontSize: 13,
      color: colors.textMuted,
      fontStyle: 'italic',
      fontFamily: fonts.italic,
      lineHeight: 20,
    },

    verseCard: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 0.5,
      borderColor: colors.border,
      alignItems: 'stretch',
    },
    verseStripe: {
      width: 3,
      backgroundColor: '#C4956A',
      opacity: 0.7,
      alignSelf: 'stretch',
    },
    verseBody: {
      flex: 1,
      padding: 14,
      gap: 6,
    },
    verseRef: {
      fontSize: 11,
      color: '#C4956A',
      fontFamily: fonts.regular,
      letterSpacing: 0.05,
    },
    verseText: {
      fontSize: 14,
      color: colors.text,
      fontStyle: 'italic',
      fontFamily: fonts.italic,
      lineHeight: 22,
    },
    noteCard: {
      flexDirection: 'row',
      gap: 10,
      backgroundColor: 'rgba(196,149,80,0.05)',
      borderRadius: 12,
      padding: 14,
      borderWidth: 0.5,
      borderColor: 'rgba(196,149,80,0.15)',
      marginTop: 4,
    },
    noteText: {
      flex: 1,
      fontSize: 13,
      color: colors.textMuted,
      fontStyle: 'italic',
      fontFamily: fonts.italic,
      lineHeight: 20,
    },

    donateSection: {
      padding: 24,
      gap: 12,
      alignItems: 'center',
    },
    donateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: '#C4956A',
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 40,
      width: '100%',
      justifyContent: 'center',
      shadowColor: '#C4956A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
    donateBtnText: {
      fontSize: 17,
      color: '#0A0A08',
      fontFamily: fonts.medium,
      letterSpacing: 0.02,
    },
    donateNote: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
      fontStyle: 'italic',
      fontFamily: fonts.italic,
      lineHeight: 18,
    },
    skipBtn: {
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    skipBtnText: {
      fontSize: 13,
      color: colors.textMuted,
      fontFamily: fonts.regular,
    },
  });
}
