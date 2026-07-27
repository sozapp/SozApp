import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ThemeColors } from '@/hooks/useTheme';
import { fonts } from '@/constants/theme';

type Props = {
  colors: ThemeColors;
  accent: string;
  activeDays: boolean[];
  dayLabels: string[];
  todayIndex: number;
};

export function WeekStreakRow({ colors, accent, activeDays, dayLabels, todayIndex }: Props) {
  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {activeDays.map((active, i) => {
        const isToday = i === todayIndex;
        return (
          <View key={i} style={styles.dayCol}>
            <Text
              style={[
                styles.dayLabel,
                { color: isToday ? accent : colors.textFaint },
              ]}
            >
              {dayLabels[i]}
            </Text>
            <View
              style={[
                styles.dot,
                active
                  ? { backgroundColor: accent }
                  : {
                      backgroundColor: 'transparent',
                      borderWidth: 1.5,
                      borderColor: isToday ? accent : colors.border,
                    },
              ]}
            >
              {active ? <Ionicons name="checkmark" size={13} color={colors.background} /> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  dayCol: {
    alignItems: 'center',
    gap: 7,
  },
  dayLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
