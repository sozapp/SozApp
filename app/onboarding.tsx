import { colors, fonts } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ONBOARDED_KEY = '@soz/onboarded';
const USER_TYPE_KEY = '@soz/userType';

export type UserType = 'faith' | 'curious' | 'research';

const BG = '#0A0A08';
const TEXT = '#E8E0D0';
const ACCENT = '#C4956A';
const MUTED = 'rgba(232,224,208,0.5)';
const DOT_ACTIVE = ACCENT;
const DOT_INACTIVE = 'rgba(255,255,255,0.3)';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CARDS: { id: UserType; title: string; subtitle: string }[] = [
  {
    id: 'faith',
    title: 'İmanımı derinleştirmek istiyorum',
    subtitle: 'Okuma planları ve günlük ayetler',
  },
  {
    id: 'curious',
    title: 'İncil hakkında merak ediyorum',
    subtitle: 'Bağlam notları ve açıklamalar',
  },
  {
    id: 'research',
    title: 'Araştırma ve çalışma için',
    subtitle: 'Çeviri karşılaştırma ve notlar',
  },
];

const FINAL_MESSAGES: Record<UserType, string> = {
  faith: 'Okuma planın seni bekliyor.',
  curious: 'Merak etmek güzel bir başlangıç.',
  research: 'Derin çalışma için her şey hazır.',
};

function StepIndicator({ step }: { step: number }) {
  return (
    <View style={styles.dots}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: i === step ? DOT_ACTIVE : DOT_INACTIVE },
          ]}
        />
      ))}
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [step, setStep] = useState(0);
  const [userType, setUserType] = useState<UserType | null>(null);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      setStep(index);
    },
    []
  );

  const goNext = useCallback(() => {
    if (step < 2) {
      flatListRef.current?.scrollToOffset({
        offset: (step + 1) * SCREEN_WIDTH,
        animated: true,
      });
      setStep(step + 1);
    }
  }, [step]);

  const finishOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
      if (userType) await AsyncStorage.setItem(USER_TYPE_KEY, userType);
    } catch (_) {}
    router.replace('/(tabs)');
  }, [userType, router]);

  const renderStep0 = () => (
    <View style={[styles.step, { width: SCREEN_WIDTH }]}>
      <View style={styles.step0Content}>
        <Text style={styles.logoSymbol}>S</Text>
        <Text style={styles.logoTitle}>Söz</Text>
        <Text style={styles.logoSubtitle}>Türkçe İncil</Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
        onPress={goNext}
      >
        <Text style={styles.primaryBtnText}>Başlayalım →</Text>
      </Pressable>
    </View>
  );

  const renderStep1 = () => (
    <View style={[styles.step, { width: SCREEN_WIDTH }]}>
      <View style={styles.step1Header}>
        <Text style={styles.step1Title}>Seni tanıyalım</Text>
        <Text style={styles.step1Subtitle}>Bu uygulamayı nasıl kullanacaksın?</Text>
      </View>
      <View style={styles.cards}>
        {CARDS.map((card) => {
          const selected = userType === card.id;
          return (
            <Pressable
              key={card.id}
              style={[
                styles.card,
                selected && styles.cardSelected,
              ]}
              onPress={() => setUserType(card.id)}
            >
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        style={[
          styles.primaryBtn,
          !userType && styles.primaryBtnDisabled,
        ]}
        onPress={goNext}
        disabled={!userType}
      >
        <Text style={styles.primaryBtnText}>Devam →</Text>
      </Pressable>
    </View>
  );

  const renderStep2 = () => (
    <View style={[styles.step, { width: SCREEN_WIDTH }]}>
      <View style={styles.step2Content}>
        <Ionicons name="checkmark-circle" size={72} color={ACCENT} style={styles.checkIcon} />
        <Text style={styles.step2Title}>Hazırsın!</Text>
        <Text style={styles.step2Message}>
          {userType ? FINAL_MESSAGES[userType] : FINAL_MESSAGES.faith}
        </Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
        onPress={finishOnboarding}
      >
        <Text style={styles.primaryBtnText}>Uygulamayı Aç →</Text>
      </Pressable>
    </View>
  );

  const renderItem = ({ item }: { item: number }) => {
    if (item === 0) return renderStep0();
    if (item === 1) return renderStep1();
    return renderStep2();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StepIndicator step={step} />
      <FlatList
        ref={flatListRef}
        data={[0, 1, 2]}
        renderItem={renderItem}
        keyExtractor={(i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        bounces={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  step: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  step0Content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoSymbol: {
    fontFamily: fonts.thin,
    fontSize: 80,
    color: ACCENT,
    marginBottom: 8,
  },
  logoTitle: {
    fontFamily: fonts.thin,
    fontSize: 52,
    color: TEXT,
    marginBottom: 8,
  },
  logoSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    letterSpacing: 0.25 * 12,
    color: ACCENT,
  },
  step1Header: {
    paddingTop: 24,
    marginBottom: 32,
  },
  step1Title: {
    fontFamily: fonts.thin,
    fontSize: 32,
    color: TEXT,
    marginBottom: 8,
  },
  step1Subtitle: {
    fontFamily: fonts.italic,
    fontSize: 14,
    color: MUTED,
  },
  cards: {
    flex: 1,
    gap: 12,
  },
  card: {
    backgroundColor: colors.dark.surface,
    borderRadius: 14,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: ACCENT,
  },
  cardTitle: {
    fontFamily: fonts.medium,
    fontSize: 17,
    color: TEXT,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: MUTED,
  },
  step2Content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    marginBottom: 24,
  },
  step2Title: {
    fontFamily: fonts.thin,
    fontSize: 38,
    color: TEXT,
    marginBottom: 16,
  },
  step2Message: {
    fontFamily: fonts.regular,
    fontSize: 18,
    color: TEXT,
    textAlign: 'center',
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
  primaryBtnDisabled: {
    opacity: 0.4,
  },
  primaryBtnText: {
    fontFamily: fonts.medium,
    fontSize: 17,
    color: colors.white,
  },
});
