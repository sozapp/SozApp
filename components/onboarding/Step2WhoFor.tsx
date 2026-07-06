import { fonts } from '@/constants/theme';
import { useHaptics } from '@/hooks/useHaptics';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
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

export type UserType = 'curious' | 'new' | 'deepen' | 'family' | 'church' | 'researcher';

const CARDS: { id: UserType; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  {
    id: 'curious',
    title: 'Meraklı',
    subtitle: 'İncil ve Hristiyanlık hakkında daha çok soru sormak istiyorum',
    icon: 'help-circle-outline',
  },
  {
    id: 'new',
    title: 'Yeni Hristiyan',
    subtitle: 'Yeni başladım, temel adımları öğrenmek istiyorum',
    icon: 'flower-outline',
  },
  {
    id: 'deepen',
    title: 'İmanını Derinleştirmek',
    subtitle: 'Daha derin okuma, dua ve düzenli ruhsal gelişim istiyorum',
    icon: 'trending-up-outline',
  },
  {
    id: 'family',
    title: 'Aile',
    subtitle: 'Ailece okuyup çocuklarla birlikte güvenli içerik görmek istiyorum',
    icon: 'home-outline',
  },
  {
    id: 'church',
    title: 'Kilise',
    subtitle: 'Toplulukla ilerlemek, etkinlik ve paylaşımları takip etmek istiyorum',
    icon: 'people-outline',
  },
  {
    id: 'researcher',
    title: 'Araştırmacı',
    subtitle: 'Harita, tarih ve kaynak odaklı araştırma yapmak istiyorum',
    icon: 'compass-outline',
  },
];

type Props = {
  selectedProfile: string | null;
  onSelectProfile: (id: UserType) => void;
  onNext: () => void;
  hideFooter?: boolean;
};

export function Step2WhoFor({
  selectedProfile,
  onSelectProfile,
  onNext,
  hideFooter,
}: Props) {
  const haptics = useHaptics();
  const progress = useRef(CARDS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    CARDS.forEach((card, i) => {
      Animated.timing(progress[i], {
        toValue: selectedProfile === card.id ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }).start();
    });
  }, [selectedProfile, progress]);

  const handleSelect = (id: UserType) => {
    haptics.selection();
    onSelectProfile(id);
  };

  const canNext = useMemo(() => selectedProfile !== null, [selectedProfile]);

  return (
    <View style={[styles.container, hideFooter && styles.containerNoFooter]}>
      <View style={styles.content}>
        <Text style={styles.title}>Kim için?</Text>
        <Text style={styles.subtitle}>Söz'ü nasıl kullanmak istiyorsun?</Text>
        <View style={styles.cardsOuter}>
        <View style={styles.cards}>
          {CARDS.map((card, i) => {
            const selected = selectedProfile === card.id;
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
                key={card.id}
                activeOpacity={0.92}
                onPress={() => handleSelect(card.id)}
              >
                <Animated.View style={[styles.forWhoCard, cardAnim]}>
                  <Animated.View style={[styles.forWhoIconWrap, iconAnim]}>
                    <Ionicons
                      name={card.icon}
                      size={21}
                      color={selected ? ICON_COLOR_ON : OB.muted}
                    />
                  </Animated.View>
                  <View style={styles.forWhoTextWrap}>
                    <Text style={styles.forWhoCardTitle}>{card.title}</Text>
                    <Text style={styles.forWhoCardDesc}>{card.subtitle}</Text>
                  </View>
                  {selected ? (
                    <Ionicons name="checkmark-circle" size={20} color={BORDER_ON} />
                  ) : null}
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
        <LinearGradient
          colors={['transparent', '#FFF8EE']}
          style={styles.cardsFade}
          pointerEvents="none"
        />
        </View>
      </View>
      {!hideFooter ? (
        <TouchableOpacity
          style={[styles.nextBtn, canNext && styles.nextBtnActive, !canNext && styles.nextBtnDisabled]}
          onPress={onNext}
          disabled={!canNext}
          activeOpacity={0.85}
        >
          <Text style={[styles.nextBtnText, canNext && styles.nextBtnTextActive]}>
            İleri →
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  containerNoFooter: {
    paddingBottom: 0,
  },
  content: {
    flex: 1,
    paddingTop: 24,
    minHeight: 0,
  },
  title: {
    fontFamily: fonts.thin,
    fontSize: 32,
    color: OB.title,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.italic,
    fontSize: 14,
    color: OB.muted,
    marginBottom: 28,
  },
  cardsOuter: {
    position: 'relative',
  },
  cards: {
    gap: 10,
  },
  cardsFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
  },
  forWhoCard: {
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  forWhoIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forWhoTextWrap: {
    flex: 1,
  },
  forWhoCardTitle: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: OB.title,
  },
  forWhoCardDesc: {
    fontSize: 13,
    color: OB.body,
    fontFamily: fonts.regular,
    fontStyle: 'italic',
    lineHeight: 19,
    marginTop: 4,
  },
  nextBtn: {
    backgroundColor: 'rgba(196,149,80,0.15)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(196,149,80,0.2)',
    width: '100%',
  },
  nextBtnDisabled: {
    opacity: 0.5,
  },
  nextBtnText: {
    fontSize: 15,
    color: OB.muted,
    fontFamily: fonts.regular,
  },
  nextBtnActive: {
    backgroundColor: OB.accent,
    shadowColor: OB.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    borderColor: 'rgba(255,220,160,0.3)',
  },
  nextBtnTextActive: {
    color: '#3E2A1C',
    fontFamily: fonts.medium,
  },
});
