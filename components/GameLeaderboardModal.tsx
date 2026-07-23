import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useTheme } from '@/hooks/useTheme';

const ACCENT = '#C4956A';
const MEDAL_COLORS = ['#D4A843', '#B8B8B8', '#B87333'];

export function GameLeaderboardModal({
  visible,
  onClose,
  gameId,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  gameId: string;
  title: string;
}) {
  const { colors, fonts } = useTheme();
  const { entries, loading, load } = useLeaderboard(gameId);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={[styles.sheet, { backgroundColor: colors.card }]} edges={['bottom']}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="trophy-outline" size={20} color={ACCENT} />
              <Text style={[styles.title, { color: colors.text, fontFamily: fonts.regular }]}>
                {title}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color={ACCENT} />
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.centerBox}>
              <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
                Henüz skor yok. İlk sırayı sen al!
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {entries.map((entry, i) => (
                <View
                  key={entry.userId}
                  style={[
                    styles.row,
                    { borderColor: colors.border },
                    entry.isMe && { backgroundColor: `${ACCENT}18`, borderColor: ACCENT },
                  ]}
                >
                  <View style={styles.rankBox}>
                    {i < 3 ? (
                      <Ionicons name="medal" size={20} color={MEDAL_COLORS[i]} />
                    ) : (
                      <Text style={[styles.rankText, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
                        {i + 1}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[styles.nameText, { color: colors.text, fontFamily: fonts.regular }]}
                    numberOfLines={1}
                  >
                    {entry.displayName}
                    {entry.isMe ? ' (Sen)' : ''}
                  </Text>
                  <Text style={[styles.scoreText, { color: ACCENT, fontFamily: fonts.regular }]}>
                    {entry.score}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '75%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBox: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
    gap: 12,
  },
  rankBox: {
    width: 28,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 14,
  },
  nameText: {
    flex: 1,
    fontSize: 15,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
