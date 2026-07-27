import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, borderRadius } from '@/constants/theme';

const ACCENT = '#C4956A';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  ctaLabel: string;
  onPress: () => void;
  textColor: string;
  mutedColor: string;
};

export function GuestWall({ icon, title, description, ctaLabel, onPress, textColor, mutedColor }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={28} color={ACCENT} />
      </View>
      <Text style={[styles.title, { color: textColor }]}>{title}</Text>
      <Text style={[styles.desc, { color: mutedColor }]}>{description}</Text>
      <Pressable style={styles.cta} onPress={onPress}>
        <Text style={styles.ctaText}>{ctaLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 32,
    alignItems: 'center',
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${ACCENT}1A`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  desc: {
    fontFamily: fonts.regular,
    fontSize: 14.5,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
    maxWidth: 280,
  },
  cta: {
    backgroundColor: ACCENT,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: borderRadius.button,
  },
  ctaText: {
    fontFamily: fonts.medium,
    color: colors.white,
    fontSize: 16,
  },
});
