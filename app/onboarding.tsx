import {
  Step1Welcome,
  Step2WhoFor,
  Step3Features,
  Step4Personalize,
  Step5Ready,
} from '@/components/onboarding';
import { OB } from '@/components/onboarding/onboardingPalette';
import { useHaptics } from '@/hooks/useHaptics';
import { SozAlert } from '@/components/SozAlert';
import { useSozAlert } from '@/hooks/useSozAlert';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/constants/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ACCENT = '#C4956A';
const ACCENT_LIGHT = '#FFF8EE';
const ONBOARDING_GRADIENT_TOP = '#EDD9B8';
const ONBOARDING_BG = ACCENT_LIGHT;

const shellStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ONBOARDING_BG,
  },
  safeTransparent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

const DOT_ACTIVE_W = 20;
const DOT_PASSIVE_W = 6;
const DOT_H = 6;
const DOT_ACTIVE_BG = ACCENT;
const DOT_PASSIVE_BG = '#D4C5B0';

const indicatorStyles = StyleSheet.create({
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: DOT_H,
    borderRadius: 3,
  },
});

function StepIndicator({
  step,
  total = 5,
}: {
  step: number;
  total?: number;
}) {
  const dotWidths = useRef(
    Array.from({ length: total }, () => new Animated.Value(DOT_PASSIVE_W))
  ).current;

  useEffect(() => {
    dotWidths.forEach((w, i) => {
      Animated.spring(w, {
        toValue: i === step ? DOT_ACTIVE_W : DOT_PASSIVE_W,
        tension: 80,
        friction: 10,
        useNativeDriver: false,
      }).start();
    });
  }, [step, dotWidths]);

  return (
    <View style={indicatorStyles.dotsRow}>
      {dotWidths.map((w, i) => (
        <Animated.View
          key={i}
          style={[
            indicatorStyles.dot,
            {
              width: w,
              backgroundColor: i === step ? DOT_ACTIVE_BG : DOT_PASSIVE_BG,
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function OnboardingScreen() {
  const { fonts } = useTheme();
  const router = useRouter();
  const haptics = useHaptics();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [selectedChurch, setSelectedChurch] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [confettiStarted, setConfettiStarted] = useState(false);
  const [showFooter, setShowFooter] = useState(true);
  const { alertConfig, showAlert, hideAlert } = useSozAlert();
  const mainScrollRef = useRef<ScrollView>(null);
  const kimIcinScrollHintDone = useRef(false);

  const styles = useMemo(() => makeStyles(fonts), [fonts]);

  useEffect(() => {
    if (currentStep !== 1 || kimIcinScrollHintDone.current) return;
    kimIcinScrollHintDone.current = true;
    const t1 = setTimeout(() => {
      mainScrollRef.current?.scrollTo({ y: 30, animated: true });
    }, 400);
    const t2 = setTimeout(() => {
      mainScrollRef.current?.scrollTo({ y: 0, animated: true });
    }, 400 + 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [currentStep]);

  const hideFooter = useCallback(() => {
    setShowFooter(false);
  }, []);

  useEffect(() => {
    if (currentStep === 4) setConfettiStarted(true);
  }, [currentStep]);

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 0:
        return true;
      case 1:
        return selectedProfile !== null;
      case 2:
        return true;
      case 3:
        return userName.trim().length >= 2;
      case 4:
        return true;
      default:
        return true;
    }
  }, [currentStep, selectedProfile, userName]);

  const goToStep = useCallback((index: number) => {
    const i = Math.max(0, Math.min(4, index));
    setCurrentStep(i);
    setShowFooter(i !== 4);
    if (i === 4) setConfettiStarted(true);
    haptics.light();
  }, [haptics]);

  const handleNext = useCallback(() => {
    if (!canProceed) return;
    if (currentStep < 4) goToStep(currentStep + 1);
  }, [canProceed, currentStep, goToStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) goToStep(currentStep - 1);
  }, [currentStep, goToStep]);

  const skipToEnd = useCallback(() => {
    goToStep(4);
  }, [goToStep]);

  const requestNotificationPermission = useCallback(async () => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
  }, []);

  const finishOnboarding = useCallback(async () => {
    const name = userName.trim();
    try {
      await AsyncStorage.multiSet([
        ['@soz/onboardingSeen', 'true'],
        ['@soz/userName', name],
        ['@soz/userProfile', selectedProfile ?? ''],
        ['@soz/userChurch', selectedChurch ?? ''],
      ]);

      if (name && supabase) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        if (uid) {
          const emailPrefix = session.user.email?.split('@')[0]?.trim() ?? '';
          const { data: prof } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', uid)
            .maybeSingle();
          const current = (prof?.display_name as string | null)?.trim() ?? '';
          const shouldOverwrite = !current || current === emailPrefix;
          if (shouldOverwrite) {
            await supabase.from('profiles').update({ display_name: name }).eq('id', uid);
          }
        }
      }
    } catch (e) {
      console.error('Onboarding kayıt hatası:', e);
    }
    router.replace('/(tabs)');
  }, [userName, selectedChurch, selectedProfile, router]);

  const finishWithPermissionPrompt = useCallback(() => {
    showAlert(
      'Bildirimler',
      'Günlük ayet hatırlatıcısı ve seri bildirimleri için izin ver.',
      [
        {
          text: 'Şimdi Değil',
          style: 'cancel',
          onPress: () => {
            void finishOnboarding();
          },
        },
        {
          text: 'İzin Ver',
          onPress: async () => {
            await requestNotificationPermission();
            await finishOnboarding();
          },
        },
      ]
    );
  }, [finishOnboarding, requestNotificationPermission, showAlert]);

  const skipDenom = useCallback(() => {
    if (currentStep === 3) goToStep(4);
  }, [currentStep, goToStep]);

  const renderScrollableSteps = () => {
    switch (currentStep) {
      case 0:
        return <Step1Welcome hideFooter onNext={() => {}} />;
      case 1:
        return (
          <Step2WhoFor
            hideFooter
            selectedProfile={selectedProfile}
            onSelectProfile={setSelectedProfile}
            onNext={() => {}}
          />
        );
      case 2:
        return <Step3Features />;
      case 4:
        return (
          <Step5Ready
            hideFooter={hideFooter}
            userName={userName}
            onFinish={finishWithPermissionPrompt}
            confettiStarted={confettiStarted}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={shellStyles.root}>
      <LinearGradient
        colors={[ONBOARDING_GRADIENT_TOP, ACCENT_LIGHT]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.45 }}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={shellStyles.safeTransparent} edges={['top', 'bottom']}>
      <View style={styles.outerContainer}>
        <View style={styles.innerContainer}>
          <View style={styles.header}>
            <StepIndicator step={currentStep} />
            {currentStep !== 4 ? (
              <TouchableOpacity
                style={styles.skipBtn}
                onPress={skipToEnd}
                hitSlop={12}
                activeOpacity={0.75}
              >
                <Text style={styles.skipText}>Atla →</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.skipBtn} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
            )}
          </View>

          <View style={styles.body}>
            {currentStep === 3 ? (
              <View style={styles.step4Wrap}>
                <Step4Personalize
                  hideFooter
                  scrollBottomInset={120}
                  userName={userName}
                  setUserName={setUserName}
                  selectedChurch={selectedChurch}
                  onSelectChurch={setSelectedChurch}
                  onSkip={skipDenom}
                  onNext={() => {}}
                />
              </View>
            ) : (
              <ScrollView
                ref={mainScrollRef}
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {renderScrollableSteps()}
              </ScrollView>
            )}
          </View>

          {showFooter ? (
            <View style={styles.bottomBar}>
              {currentStep > 0 ? (
                <TouchableOpacity
                  style={[styles.backBtn, { borderColor: OB.border }]}
                  onPress={handleBack}
                  activeOpacity={0.85}
                >
                  <Ionicons name="arrow-back" size={20} color={OB.muted} />
                  <Text style={[styles.backBtnText, { color: OB.muted }]}>
                    Geri
                  </Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.nextBtn,
                  !canProceed && styles.nextBtnDisabled,
                  currentStep === 0 && styles.nextBtnFull,
                ]}
                onPress={handleNext}
                disabled={!canProceed}
                activeOpacity={canProceed ? 0.85 : 1}
              >
                <Text style={styles.nextBtnText}>İleri</Text>
                <Ionicons name="arrow-forward" size={16} color={OB.title} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
      </SafeAreaView>
      <SozAlert {...alertConfig} onDismiss={hideAlert} />
    </View>
  );
}

function makeStyles(fonts: { regular: string; medium: string }) {
  return StyleSheet.create({
    outerContainer: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
    },
    innerContainer: {
      flex: 1,
      width: '100%',
      minHeight: 0,
      alignSelf: 'stretch',
      backgroundColor: 'transparent',
      position: 'relative',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 12,
      backgroundColor: 'transparent',
    },
    skipBtn: {
      paddingVertical: 8,
      paddingLeft: 16,
      minWidth: 76,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    skipText: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: OB.muted,
    },
    body: {
      flex: 1,
      minHeight: 0,
      width: '100%',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: 120,
    },
    step4Wrap: {
      flex: 1,
      minHeight: 0,
    },
    bottomBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 10,
      gap: 12,
      backgroundColor: 'transparent',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: OB.border,
    },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 0.5,
    },
    backBtnText: {
      fontSize: 14,
      fontFamily: fonts.regular,
    },
    nextBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: OB.accent,
      borderRadius: 12,
      paddingVertical: 15,
      shadowColor: OB.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 5,
    },
    nextBtnFull: {
      flex: 1,
    },
    nextBtnDisabled: {
      backgroundColor: ACCENT,
      opacity: 0.45,
    },
    nextBtnText: {
      fontSize: 16,
      color: OB.title,
      fontFamily: fonts.medium,
    },
  });
}
