import { fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const ACCENT = '#C4956A';

export type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  buttonText?: string;
  onButtonPress?: () => void;
};

export function EmptyState({
  icon,
  title,
  description,
  buttonText,
  onButtonPress,
}: EmptyStateProps) {
  const { theme } = useTheme();
  const text = theme.text ?? '#E8E0D0';
  const muted = theme.textMuted ?? 'rgba(232,224,208,0.5)';

  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={56} color="rgba(196,149,80,0.25)" />
      </View>
      <Text style={[styles.title, { color: text }]}>{title}</Text>
      <Text style={[styles.desc, { color: muted }]}>{description}</Text>
      {buttonText != null && onButtonPress != null ? (
        <Pressable
          style={[styles.btn, { borderColor: ACCENT }]}
          onPress={onButtonPress}
        >
          <Text style={[styles.btnText, { color: ACCENT }]}>{buttonText}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(196,149,80,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: fonts.thin,
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 10,
  },
  desc: {
    fontFamily: fonts.italic,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  btn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  btnText: {
    fontFamily: fonts.medium,
    fontSize: 15,
  },
});
