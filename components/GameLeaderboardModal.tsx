import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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

import { EmptyState } from '@/components/EmptyState';
import { useTranslation } from '@/context/LanguageContext';
import {
  useLeaderboard,
  type LeaderboardScope,
} from '@/hooks/useLeaderboard';
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
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, fonts, resolvedTheme } = useTheme();
  /** Varsayılan: arkadaşlar — tanıdıklarla rekabet daha motive edici. */
  const [scope, setScope] = useState<LeaderboardScope>('friends');
  const { entries, loading, friendCount, load } = useLeaderboard(gameId, scope);
  const isLightTheme = resolvedTheme === 'day' || resolvedTheme === 'sepia';
  const medalColors = isLightTheme ? MEDAL_COLORS_LIGHT : MEDAL_COLORS_DARK;
  const scoreColor = isLightTheme ? SCORE_COLOR_LIGHT : ACCENT;

  const translateY = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      setScope('friends');
    }
  }, [visible, gameId]);

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

  const renderBody = () => {
    if (loading) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator color={ACCENT} />
        </View>
      );
    }

    if (scope === 'friends' && friendCount === 0) {
      return (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="people-outline"
            title={t('noFriendsYet')}
            description={t('leaderboardNoFriendsDesc')}
            buttonText={t('inviteFriend')}
            onButtonPress={() => {
              finishClose();
              router.push('/friends' as never);
            }}
          />
          <Pressable
            onPress={() => setScope('global')}
            hitSlop={8}
            accessibilityRole="button"
            style={styles.switchScopeLink}
          >
            <Text style={[styles.switchScopeText, { color: ACCENT, fontFamily: fonts.regular }]}>
              {t('leaderboardViewGlobal')}
            </Text>
          </Pressable>
        </View>
      );
    }

    if (entries.length === 0) {
      return (
        <View style={styles.centerBox}>
          <Text
            style={[styles.emptyText, { color: colors.textSecondary, fontFamily: fonts.regular }]}
          >
            {scope === 'friends' ? t('leaderboardNoFriendScores') : t('leaderboardNoScores')}
          </Text>
        </View>
      );
    }

    return (
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
    );
  };

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

            <View style={[styles.scopeRow, { backgroundColor: colors.background }]}>
              {(
                [
                  { id: 'friends' as const, label: t('friends') },
                  { id: 'global' as const, label: t('leaderboardGlobal') },
                ] as const
              ).map((tab) => {
                const active = scope === tab.id;
                return (
                  <Pressable
                    key={tab.id}
                    onPress={() => setScope(tab.id)}
                    style={[
                      styles.scopeTab,
                      active && { backgroundColor: `${ACCENT}22`, borderColor: ACCENT },
                      !active && { borderColor: 'transparent' },
                    ]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[
                        styles.scopeTabText,
                        {
                          color: active ? ACCENT : colors.textSecondary,
                          fontFamily: fonts.regular,
                        },
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {renderBody()}
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
  scopeRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 4,
    borderRadius: 12,
    gap: 4,
  },
  scopeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  scopeTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  centerBox: {
    paddingVertical: 48,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyWrap: {
    paddingBottom: 16,
  },
  switchScopeLink: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: -4,
  },
  switchScopeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
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
