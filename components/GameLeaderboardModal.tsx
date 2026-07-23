import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  PanGestureHandler,
  State,
  type PanGestureHandlerGestureEvent,
  type PanGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useTheme } from '@/hooks/useTheme';

const ACCENT = '#C4956A';
/** Koyu temalarda parlak madalya; day/sepia kartında soluk kalmasın diye koyu varyant. */
const MEDAL_COLORS_DARK = ['#D4A843', '#B8B8B8', '#B87333'] as const;
const MEDAL_COLORS_LIGHT = ['#8B6914', '#6E6E6E', '#8B4513'] as const;
/** ACCENT skor, açık kart zemininde (~2:1) okunaksız — day/sepia için koyu kehribar. */
const SCORE_COLOR_LIGHT = '#8B6914';

const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 900;
const SHEET_OFFSCREEN = 520;

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
  const { colors, fonts, resolvedTheme } = useTheme();
  const { entries, loading, load } = useLeaderboard(gameId);
  const isLightTheme = resolvedTheme === 'day' || resolvedTheme === 'sepia';
  const medalColors = isLightTheme ? MEDAL_COLORS_LIGHT : MEDAL_COLORS_DARK;
  const scoreColor = isLightTheme ? SCORE_COLOR_LIGHT : ACCENT;

  const translateY = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  useEffect(() => {
    if (visible) {
      closingRef.current = false;
      translateY.setValue(0);
    }
  }, [visible, translateY]);

  const finishClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.timing(translateY, {
      toValue: SHEET_OFFSCREEN,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      translateY.setValue(0);
      closingRef.current = false;
      onClose();
    });
  }, [onClose, translateY]);

  const onGestureEvent = useCallback(
    (event: PanGestureHandlerGestureEvent) => {
      const y = Math.max(0, event.nativeEvent.translationY);
      translateY.setValue(y);
    },
    [translateY]
  );

  const onHandlerStateChange = useCallback(
    (event: PanGestureHandlerStateChangeEvent) => {
      if (event.nativeEvent.oldState !== State.ACTIVE) return;
      const { translationY: ty, velocityY } = event.nativeEvent;
      const shouldDismiss = ty > DISMISS_DISTANCE || velocityY > DISMISS_VELOCITY;
      if (shouldDismiss) {
        finishClose();
        return;
      }
      Animated.spring(translateY, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    },
    [finishClose, translateY]
  );

  const backdropOpacity = translateY.interpolate({
    inputRange: [0, 280],
    outputRange: [1, 0.15],
    extrapolate: 'clamp',
  });

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={finishClose}>
      <View style={styles.backdropRoot}>
        <Animated.View style={[styles.backdropDim, { opacity: backdropOpacity }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={finishClose}
            accessibilityRole="button"
            accessibilityLabel="Kapat"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheetWrap,
            { backgroundColor: colors.card, transform: [{ translateY }] },
          ]}
        >
          <SafeAreaView edges={['bottom']} style={styles.sheetInner}>
            {/* Pan yalnızca tutamaç + başlıkta — ScrollView ile çakışmaz */}
            <PanGestureHandler
              onGestureEvent={onGestureEvent}
              onHandlerStateChange={onHandlerStateChange}
              activeOffsetY={8}
              failOffsetX={[-28, 28]}
            >
              <Animated.View>
                <View style={styles.handleHit}>
                  <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
                </View>

                <View style={styles.header}>
                  <View style={styles.headerTitleRow}>
                    <Ionicons name="trophy-outline" size={20} color={ACCENT} />
                    <Text style={[styles.title, { color: colors.text, fontFamily: fonts.regular }]}>
                      {title}
                    </Text>
                  </View>
                  <Pressable
                    onPress={finishClose}
                    hitSlop={12}
                    style={styles.closeBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Kapat"
                  >
                    <Ionicons name="close" size={22} color={colors.textSecondary} />
                  </Pressable>
                </View>
              </Animated.View>
            </PanGestureHandler>

            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator color={ACCENT} />
              </View>
            ) : entries.length === 0 ? (
              <View style={styles.centerBox}>
                <Text
                  style={[styles.emptyText, { color: colors.textSecondary, fontFamily: fonts.regular }]}
                >
                  Henüz skor yok. İlk sırayı sen al!
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.list} showsVerticalScrollIndicator={false} bounces>
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
                        <Ionicons name="medal" size={20} color={medalColors[i]} />
                      ) : (
                        <Text
                          style={[
                            styles.rankText,
                            { color: colors.textSecondary, fontFamily: fonts.regular },
                          ]}
                        >
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
                    <Text style={[styles.scoreText, { color: scoreColor, fontFamily: fonts.regular }]}>
                      {entry.score}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetWrap: {
    maxHeight: '75%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  sheetInner: {
    maxHeight: '100%',
  },
  handleHit: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.9,
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
