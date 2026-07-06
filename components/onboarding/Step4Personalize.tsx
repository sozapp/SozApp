import { denominations } from '@/constants/denominations';
import type { Denomination } from '@/constants/denominations';
import { fonts } from '@/constants/theme';
import { useHaptics } from '@/hooks/useHaptics';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { OB } from './onboardingPalette';

const CARD_BG_OFF = '#FFFFFF';
const CARD_BG_ON = '#FFF0E0';
const BORDER_OFF = '#E8E0D5';
const BORDER_ON = '#C4956A';
const ICON_BG_OFF = '#F5F1EB';
const ICON_BG_ON = '#C4956A';
const ICON_COLOR_ON = '#FFF8EE';

type Props = {
  userName: string;
  setUserName: (s: string) => void;
  selectedChurch: string | null;
  onSelectChurch: (id: Denomination) => void;
  onSkip: () => void;
  onNext: () => void;
  hideFooter?: boolean;
  scrollBottomInset?: number;
};

export function Step4Personalize({
  userName,
  setUserName,
  selectedChurch,
  onSelectChurch,
  onSkip,
  onNext,
  hideFooter,
  scrollBottomInset = 20,
}: Props) {
  const haptics = useHaptics();
  const underlineWidth = useRef(new Animated.Value(0)).current;
  const [focused, setFocused] = useState(false);
  const progress = useRef(denominations.map(() => new Animated.Value(0))).current;
  const scrollRef = useRef<ScrollView>(null);
  const kiliseScrollHintDone = useRef(false);

  useEffect(() => {
    if (kiliseScrollHintDone.current) return;
    kiliseScrollHintDone.current = true;
    const t1 = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 30, animated: true });
    }, 400);
    const t2 = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }, 400 + 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    denominations.forEach((d, i) => {
      Animated.timing(progress[i], {
        toValue: selectedChurch === d.id ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }).start();
    });
  }, [selectedChurch, progress]);

  useEffect(() => {
    Animated.timing(underlineWidth, {
      toValue: focused || userName.length > 0 ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [focused, userName.length, underlineWidth]);

  const underlineStyle = {
    width: underlineWidth.interpolate({ inputRange: [0, 1], outputRange: [0, 280] }),
  };

  const handleSelectChurch = (id: Denomination) => {
    haptics.selection();
    onSelectChurch(id);
  };

  const canNext = userName.trim().length > 1 && selectedChurch !== null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollBottomInset },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <View style={styles.nameSection}>
          <Text style={styles.inputLabel}>Adınız</Text>
          <View style={styles.inputWrap}>
            <Ionicons
              name="person-outline"
              size={16}
              color={OB.muted}
              style={{ marginLeft: 14 }}
            />
            <TextInput
              style={styles.nameInput}
              placeholder="Adınızı girin..."
              placeholderTextColor={OB.muted}
              value={userName}
              onChangeText={setUserName}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={40}
              returnKeyType="done"
            />
          </View>
          <Animated.View style={[styles.underline, underlineStyle]} />
        </View>

        <View style={styles.denomSection}>
          <View style={styles.denomHeader}>
            <Text style={styles.denomTitle}>Kilise geleneğiniz?</Text>
            <TouchableOpacity onPress={onSkip} hitSlop={12}>
              <Text style={styles.skipText}>Atla</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.denomListWrap}>
          <View style={styles.denomList}>
            {denominations.map((d, i) => {
              const selected = selectedChurch === d.id;
              const p = progress[i];
              const cardAnim = {
                backgroundColor: p.interpolate({
                  inputRange: [0, 1],
                  outputRange: [CARD_BG_OFF, CARD_BG_ON],
                }),
                borderColor: p.interpolate({
                  inputRange: [0, 1],
                  outputRange: [BORDER_OFF, BORDER_ON],
                }),
                borderWidth: p.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 2],
                }),
              };
              const iconAnim = {
                backgroundColor: p.interpolate({
                  inputRange: [0, 1],
                  outputRange: [ICON_BG_OFF, ICON_BG_ON],
                }),
              };
              return (
                <TouchableOpacity
                  key={d.id}
                  activeOpacity={0.92}
                  onPress={() => handleSelectChurch(d.id)}
                >
                  <Animated.View style={[styles.traditionItem, cardAnim]}>
                    <View style={styles.traditionRowInner}>
                      <Animated.View style={[styles.traditionIconWrap, iconAnim]}>
                        <Ionicons
                          name={d.icon as keyof typeof Ionicons.glyphMap}
                          size={20}
                          color={selected ? ICON_COLOR_ON : OB.muted}
                        />
                      </Animated.View>
                      <View style={styles.traditionText}>
                        <Text style={[styles.traditionName, selected && styles.traditionNameSelected]}>
                          {d.name}
                        </Text>
                        {d.description ? (
                          <Text style={styles.traditionDesc}>{d.description}</Text>
                        ) : null}
                      </View>
                      {selected ? (
                        <Ionicons name="checkmark-circle" size={20} color={BORDER_ON} />
                      ) : null}
                    </View>
                  </Animated.View>
                </TouchableOpacity>
              );
            })}
          </View>
          <LinearGradient
            colors={['transparent', '#FFF8EE']}
            style={styles.denomListFade}
            pointerEvents="none"
          />
          </View>
        </View>
      </ScrollView>

      {!hideFooter ? (
        <TouchableOpacity
          style={[styles.btn, (!canNext) && styles.btnDisabled]}
          onPress={onNext}
          disabled={!canNext}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>İleri →</Text>
        </TouchableOpacity>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
    paddingBottom: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
  },
  traditionRowInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  nameSection: {
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 11,
    letterSpacing: 0.15,
    color: 'rgba(196,149,80,0.7)',
    fontFamily: fonts.regular,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: OB.border,
    overflow: 'hidden',
  },
  nameInput: {
    flex: 1,
    fontSize: 16,
    color: OB.title,
    fontFamily: fonts.regular,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  underline: {
    height: 1,
    backgroundColor: OB.accent,
    alignSelf: 'center',
  },
  denomSection: {
    marginBottom: 16,
  },
  denomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  denomTitle: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: OB.title,
  },
  skipText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: OB.muted,
  },
  denomListWrap: {
    position: 'relative',
    marginTop: 2,
  },
  denomList: {
    gap: 0,
  },
  denomListFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
  },
  traditionItem: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  traditionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  traditionText: {
    flex: 1,
  },
  traditionName: {
    fontSize: 15,
    color: OB.body,
    fontFamily: fonts.regular,
  },
  traditionNameSelected: {
    color: BORDER_ON,
    fontFamily: fonts.medium,
  },
  traditionDesc: {
    fontSize: 12,
    color: OB.muted,
    fontStyle: 'italic',
    fontFamily: fonts.italic,
    marginTop: 2,
  },
  btn: {
    marginHorizontal: 24,
    backgroundColor: OB.accent,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    fontFamily: fonts.medium,
    fontSize: 17,
    color: '#3E2A1C',
  },
});
