import { fonts } from '@/constants/theme';
import type { TranslationKey } from '@/constants/i18n';
import { useTranslation } from '@/context/LanguageContext';
import { useHaptics } from '@/hooks/useHaptics';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

const TUTORIAL_SEEN_KEY = '@soz/tutorialSeen';
const BG = '#0A0A08';
const ACCENT = '#C4956A';
const MUTED = 'rgba(232,224,208,0.5)';
const CARD_BG = '#1A1208';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PADDING = 32;

// —— Step data: component DIŞINDA, hook yok ——
type StepData = {
  id: number;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: keyof typeof Ionicons.glyphMap;
};

const STEPS: StepData[] = [
  {
    id: 0,
    titleKey: 'tutorialStepReadTitle',
    descriptionKey: 'tutorialStepReadDesc',
    icon: 'book-outline',
  },
  {
    id: 1,
    titleKey: 'tutorialStepHighlightTitle',
    descriptionKey: 'tutorialStepHighlightDesc',
    icon: 'color-palette-outline',
  },
  {
    id: 2,
    titleKey: 'tutorialStepMapTitle',
    descriptionKey: 'tutorialStepMapDesc',
    icon: 'map-outline',
  },
  {
    id: 3,
    titleKey: 'tutorialStepShareTitle',
    descriptionKey: 'tutorialStepShareDesc',
    icon: 'share-social-outline',
  },
  {
    id: 4,
    titleKey: 'tutorialStepGroupTitle',
    descriptionKey: 'tutorialStepGroupDesc',
    icon: 'people-outline',
  },
];

// —— Helper: sadece JSX döndürür, hook YOK ——
function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === step ? styles.dotActive : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

function ReadingMockup(): ReactNode {
  return (
    <View style={styles.mockupContainer}>
      <View style={[styles.mockupToolbar, { backgroundColor: 'rgba(26,22,18,0.95)' }]}>
        <View style={styles.mockupToolbarLeft}>
          <View style={styles.mockupBtn} />
          <Text style={styles.mockupToolbarTitle} numberOfLines={1}>Yuhanna 3</Text>
        </View>
        <View style={styles.mockupBtn} />
      </View>
      <View style={styles.mockupContent}>
        <Text style={styles.mockupVerseFaded}>Başlangıçta Söz vardı.</Text>
        <Text style={styles.mockupVerseFaded}>Söz Tanrı'yla birlikteydi...</Text>
        <Text style={styles.mockupVerseFaded}>Çünkü Tanrı dünyayı o kadar çok sevdi ki, biricik Oğlu'nu verdi.</Text>
        <Text style={styles.mockupVerseFaded}>Öyle ki, O'na iman edenlerin hiçbiri mahvolmasın...</Text>
      </View>
    </View>
  );
}

function HighlightMockup(): ReactNode {
  return (
    <View style={styles.mockupContainer}>
      <View style={[styles.mockupCard, { backgroundColor: 'rgba(196,149,106,0.12)', borderLeftColor: ACCENT }]}>
        <Text style={styles.mockupVerseHighlight}>Çünkü Tanrı dünyayı o kadar çok sevdi ki, biricik Oğlu'nu verdi.</Text>
        <Text style={styles.mockupRef}>Yuhanna 3:16</Text>
      </View>
    </View>
  );
}

function MapMockup(): ReactNode {
  const { t } = useTranslation();
  return (
    <View style={styles.mockupContainer}>
      <View style={styles.mapPreview}>
        <Svg width="100%" height={200} viewBox="0 0 400 200" style={styles.mapSvg}>
          <Path
            d="M20 80 Q60 40 120 50 Q160 30 200 45 Q250 25 300 40 Q350 30 380 60 Q390 80 370 100 Q340 120 300 110 Q260 130 220 115 Q180 130 140 120 Q100 130 60 115 Q30 110 20 80Z"
            fill="rgba(196,149,80,0.15)"
            stroke="#C4956A"
            strokeWidth="1.5"
          />
          <Circle cx="95" cy="95" r="5" fill="#C4956A" />
          <Circle cx="175" cy="105" r="5" fill="#C4956A" />
          <Circle cx="260" cy="85" r="5" fill="#C4956A" />
          <Circle cx="195" cy="75" r="5" fill="#C4956A" />
          <Circle cx="140" cy="88" r="5" fill="#C4956A" />
          <SvgText x="95" y="82" fontSize="9" fill="#C4956A" textAnchor="middle">Efes</SvgText>
          <SvgText x="175" y="92" fontSize="9" fill="#C4956A" textAnchor="middle">Antakya</SvgText>
          <SvgText x="260" y="72" fontSize="9" fill="#C4956A" textAnchor="middle">Tarsus</SvgText>
        </Svg>
        <Text style={styles.mapLabel}>{t('tutorialMapLabel')}</Text>
      </View>
    </View>
  );
}

function VerseCardMockup(): ReactNode {
  return (
    <View style={styles.mockupContainer}>
      <View style={[styles.mockupVerseCard, { backgroundColor: CARD_BG }]}>
        <Text style={styles.mockupVerseCardText}>«Çünkü Tanrı dünyayı o kadar çok sevdi ki, biricik Oğlu'nu verdi.»</Text>
        <Text style={styles.mockupVerseCardRef}>— Yuhanna 3:16</Text>
      </View>
    </View>
  );
}

function GroupMockup(): ReactNode {
  const { t } = useTranslation();
  return (
    <View style={styles.mockupContainer}>
      <View style={[styles.mockupGroup, { backgroundColor: 'rgba(26,22,18,0.95)' }]}>
        <Text style={styles.mockupGroupTitle}>{t('churchGroup')}</Text>
        <View style={styles.mockupMember}>
          <View style={styles.mockupAvatar} />
          <Text style={styles.mockupMemberName}>Ahmet</Text>
        </View>
        <View style={styles.mockupMember}>
          <View style={styles.mockupAvatar} />
          <Text style={styles.mockupMemberName}>Ayşe</Text>
        </View>
        <View style={styles.mockupMember}>
          <View style={styles.mockupAvatar} />
          <Text style={styles.mockupMemberName}>Mehmet</Text>
        </View>
      </View>
    </View>
  );
}

/** Saf fonksiyon: step id'ye göre üst alan JSX'i döndürür. Hook kullanılmaz. */
function renderTopForStep(stepId: number): ReactNode {
  switch (stepId) {
    case 0: return <ReadingMockup />;
    case 1: return <HighlightMockup />;
    case 2: return <MapMockup />;
    case 3: return <VerseCardMockup />;
    case 4: return <GroupMockup />;
    default: return null;
  }
}

export default function TutorialScreen() {
  // 1. Tüm hook'lar en üstte
  const router = useRouter();
  const { t } = useTranslation();
  const haptics = useHaptics();
  const flatListRef = useRef<FlatList>(null);
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // 2. Handler fonksiyonlar
  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      if (index !== step) {
        haptics.light();
        setStep(index);
      }
    },
    [step, haptics]
  );

  const skipTutorial = useCallback(async () => {
    haptics.light();
    try {
      await AsyncStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
    } catch (_) {}
    router.replace('/(tabs)');
  }, [router, haptics]);

  const finishTutorial = useCallback(async () => {
    haptics.success();
    try {
      await AsyncStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
    } catch (_) {}
    router.replace('/(tabs)');
  }, [router, haptics]);

  const goNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      haptics.light();
      flatListRef.current?.scrollToOffset({
        offset: (step + 1) * SCREEN_WIDTH,
        animated: true,
      });
      setStep(step + 1);
    } else {
      finishTutorial();
    }
  }, [step, finishTutorial, haptics]);

  const renderItem = useCallback(
    ({ item }: { item: StepData }) => (
      <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
        <View style={styles.topSection}>{renderTopForStep(item.id)}</View>
        <View style={styles.bottomSection}>
          <View style={styles.iconWrap}>
            <Ionicons name={item.icon} size={56} color={ACCENT} />
          </View>
          <Text style={styles.title}>{t(item.titleKey)}</Text>
          <Text style={styles.description}>{t(item.descriptionKey)}</Text>
          {item.id === STEPS.length - 1 ? (
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
              onPress={finishTutorial}
            >
              <Text style={styles.primaryBtnText}>{t('letsGo')}</Text>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.nextBtn, pressed && styles.nextBtnPressed]}
              onPress={goNext}
            >
              <Text style={styles.nextBtnText}>{t('continueShortArrow')}</Text>
            </Pressable>
          )}
        </View>
      </View>
    ),
    [goNext, finishTutorial, t]
  );

  // 3. Return
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <StepIndicator step={step} total={STEPS.length} />
        <Pressable onPress={skipTutorial} style={styles.skipBtn} hitSlop={12}>
          <Text style={styles.skipText}>{t('skip')}</Text>
        </Pressable>
      </View>
      <Animated.View style={[styles.animatedWrap, { opacity: fadeAnim }]}>
        <FlatList
          ref={flatListRef}
          data={STEPS}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={16}
          bounces={false}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PADDING,
    paddingVertical: 12,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    borderRadius: 4,
  },
  dotActive: {
    width: 8,
    height: 8,
    backgroundColor: ACCENT,
  },
  dotInactive: {
    width: 6,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  skipBtn: {
    padding: 4,
  },
  skipText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: MUTED,
  },
  animatedWrap: {
    flex: 1,
  },
  slide: {
    flex: 1,
    paddingHorizontal: PADDING,
  },
  topSection: {
    flex: 0.55,
    justifyContent: 'center',
  },
  bottomSection: {
    flex: 0.45,
    paddingTop: 24,
  },
  iconWrap: {
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.thin,
    fontSize: 28,
    color: '#E8E0D0',
    marginBottom: 12,
  },
  description: {
    fontFamily: fonts.italic,
    fontSize: 15,
    color: MUTED,
    lineHeight: 15 * 1.7,
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    width: '100%',
  },
  primaryBtnPressed: {
    opacity: 0.9,
  },
  primaryBtnText: {
    fontFamily: fonts.medium,
    fontSize: 17,
    color: '#fff',
  },
  nextBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  nextBtnPressed: {
    opacity: 0.8,
  },
  nextBtnText: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: ACCENT,
  },
  mockupContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: 320,
  },
  mockupToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(196,149,106,0.2)',
  },
  mockupToolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mockupBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  mockupToolbarTitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: '#E8E0D0',
    maxWidth: 140,
  },
  mockupContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  mockupVerseFaded: {
    fontFamily: fonts.italic,
    fontSize: 15,
    color: 'rgba(232,224,208,0.35)',
    marginBottom: 10,
    lineHeight: 22,
  },
  mockupCard: {
    flex: 1,
    padding: 20,
    borderLeftWidth: 4,
    justifyContent: 'center',
  },
  mockupVerseHighlight: {
    fontFamily: fonts.italic,
    fontSize: 16,
    color: '#E8E0D0',
    lineHeight: 24,
  },
  mockupRef: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: MUTED,
    marginTop: 10,
  },
  mapPreview: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapSvg: {
    width: '100%',
  },
  mapLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: MUTED,
    marginTop: 12,
  },
  mockupVerseCard: {
    flex: 1,
    padding: 28,
    borderRadius: 14,
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(196,149,106,0.25)',
  },
  mockupVerseCardText: {
    fontFamily: fonts.italic,
    fontSize: 18,
    color: ACCENT,
    lineHeight: 28,
    textAlign: 'center',
  },
  mockupVerseCardRef: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    marginTop: 16,
  },
  mockupGroup: {
    flex: 1,
    padding: 20,
    borderRadius: 14,
  },
  mockupGroupTitle: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: '#E8E0D0',
    marginBottom: 16,
  },
  mockupMember: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  mockupAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(196,149,106,0.25)',
  },
  mockupMemberName: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: '#E8E0D0',
  },
});
