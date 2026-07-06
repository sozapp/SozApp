import { AMBIENT_TRACKS } from '@/hooks/useAmbientMusic';
import { useAmbientMusic } from '@/context/AmbientMusicContext';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const ACCENT = '#C4956A';
const ACCENT_LIGHT = '#FFF8EE';

/** Okuma ekranı mini oynatıcı için (dışa aktarılır) */
export function MiniWaveBar({ index, color }: { index: number; color: string }) {
  const scaleAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.9 + index * 0.05,
          duration: 250 + index * 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.3,
          duration: 250 + index * 100,
          useNativeDriver: true,
        }),
      ]),
    );
    const t = setTimeout(() => loop.start(), index * 120);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, [index, scaleAnim]);

  return (
    <Animated.View
      style={{
        width: 2.5,
        height: 14,
        borderRadius: 1.5,
        backgroundColor: color,
        transform: [{ scaleY: scaleAnim }],
      }}
    />
  );
}

const BAR_BASE_H = 14;
const SCALE_4 = 4 / BAR_BASE_H;
const SCALE_8 = 8 / BAR_BASE_H;
const SCALE_14 = 1;

/** Aktif kartta 3 bar — scaleY + useNativeDriver */
function ActiveTrackWaveBars({ color }: { color: string }) {
  const s0 = useRef(new Animated.Value(SCALE_14)).current;
  const s1 = useRef(new Animated.Value(SCALE_14)).current;
  const s2 = useRef(new Animated.Value(SCALE_14)).current;
  const scales = [s0, s1, s2];
  const delays = [0, 120, 240];

  useEffect(() => {
    const bounce = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: SCALE_4, duration: 220, useNativeDriver: true }),
          Animated.timing(anim, { toValue: SCALE_14, duration: 220, useNativeDriver: true }),
          Animated.timing(anim, { toValue: SCALE_8, duration: 180, useNativeDriver: true }),
          Animated.timing(anim, { toValue: SCALE_14, duration: 220, useNativeDriver: true }),
          Animated.timing(anim, { toValue: SCALE_4, duration: 220, useNativeDriver: true }),
          Animated.timing(anim, { toValue: SCALE_14, duration: 220, useNativeDriver: true }),
        ]),
      );

    const loops = scales.map((anim, i) => bounce(anim, delays[i]));
    loops.forEach((l) => l.start());
    return () => {
      loops.forEach((l) => l.stop());
    };
  }, [s0, s1, s2]);

  return (
    <View style={waveBarStyles.wrap}>
      {scales.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            waveBarStyles.bar,
            {
              backgroundColor: color,
              transform: [{ scaleY: anim }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const waveBarStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: BAR_BASE_H,
  },
  bar: {
    width: 3,
    height: BAR_BASE_H,
    borderRadius: 2,
  },
});

export interface AmbientMusicModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AmbientMusicModal({ visible, onClose }: AmbientMusicModalProps) {
  const { colors, fonts } = useTheme();
  const {
    currentTrack,
    isPlaying,
    volume,
    toggleTrack,
    togglePlay,
    changeVolume,
  } = useAmbientMusic();

  const slideAnim = useRef(new Animated.Value(400)).current;
  const volTrackWRef = useRef(200);

  const setVolumeFromX = useCallback(
    (x: number) => {
      const w = volTrackWRef.current;
      if (w <= 0) return;
      void changeVolume(Math.min(Math.max(x / w, 0), 1));
    },
    [changeVolume],
  );

  const volPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const lx = e.nativeEvent.locationX;
        setVolumeFromX(lx);
      },
      onPanResponderMove: (e) => {
        const lx = e.nativeEvent.locationX;
        setVolumeFromX(lx);
      },
    }),
  ).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: false,
        friction: 9,
        tension: 65,
      }).start();
    } else {
      slideAnim.setValue(400);
    }
  }, [visible, slideAnim]);

  const playingLabel =
    isPlaying && currentTrack && currentTrack.id !== 'silence'
      ? `♪ ${currentTrack.name} çalıyor`
      : null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.header}>
            <View style={styles.headerTextCol}>
              <Text style={[styles.title, { color: colors.text, fontFamily: fonts.regular }]}>
                Ortam Müziği
              </Text>
              {playingLabel ? (
                <Text
                  style={[
                    styles.nowPlaying,
                    { color: ACCENT, fontFamily: fonts.italic },
                  ]}
                >
                  {playingLabel}
                </Text>
              ) : (
                <Text
                  style={[
                    styles.nowPlayingMuted,
                    { color: colors.textSecondary, fontFamily: fonts.regular },
                  ]}
                >
                  Bir ses seç
                </Text>
              )}
              <Text
                style={[
                  styles.subtitle,
                  { color: colors.textMuted, fontFamily: fonts.italic },
                ]}
              >
                Okurken arka plan sesi
              </Text>
            </View>
            {currentTrack?.id !== 'silence' && (
              <TouchableOpacity
                style={[styles.playBtn, { backgroundColor: ACCENT }]}
                onPress={() => void togglePlay()}
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={20}
                  color={ACCENT_LIGHT}
                />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.volumeRow}>
            <Ionicons name="volume-off-outline" size={20} color={colors.textSecondary} />
            <View
              style={styles.volumeStrip}
              onLayout={(e) => {
                volTrackWRef.current = e.nativeEvent.layout.width;
              }}
              {...volPan.panHandlers}
            >
              <View style={[styles.volumeTrack, { backgroundColor: `${ACCENT}28` }]}>
                <View
                  style={[styles.volumeFill, { width: `${volume * 100}%`, backgroundColor: ACCENT }]}
                />
              </View>
            </View>
            <Ionicons name="volume-high-outline" size={20} color={colors.textSecondary} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPad}>
            <View style={styles.tracksGrid}>
              {AMBIENT_TRACKS.map((track) => {
                const active = currentTrack?.id === track.id;
                const activePlaying = active && isPlaying;
                const isSilence = track.id === 'silence';

                return (
                  <TouchableOpacity
                    key={track.id}
                    style={[
                      styles.trackCard,
                      activePlaying
                        ? {
                            borderColor: ACCENT,
                            borderWidth: 2,
                            backgroundColor: `${ACCENT}15`,
                          }
                        : {
                            borderColor: colors.border,
                            borderWidth: 1,
                            backgroundColor: colors.card,
                          },
                    ]}
                    onPress={() => {
                      void toggleTrack(track.id);
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={styles.trackTopRow}>
                      {activePlaying ? (
                        <ActiveTrackWaveBars color={ACCENT} />
                      ) : (
                        <View style={styles.wavePlaceholder} />
                      )}
                      <View
                        style={[
                          styles.trackIcon,
                          {
                            backgroundColor: active ? `${ACCENT}22` : colors.surface,
                            borderColor: active ? ACCENT : colors.border,
                            borderWidth: 1,
                          },
                        ]}
                      >
                        <Ionicons
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          name={track.icon as any}
                          size={24}
                          color={active ? ACCENT : colors.textSecondary}
                        />
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.trackName,
                        { color: colors.text, fontFamily: fonts.regular },
                        active && { color: ACCENT },
                      ]}
                    >
                      {track.name}
                    </Text>
                    <Text
                      style={[
                        styles.trackDesc,
                        { color: colors.textMuted, fontFamily: fonts.italic },
                      ]}
                    >
                      {track.desc}
                    </Text>
                    <Text
                      style={[
                        styles.durationLabel,
                        {
                          color: colors.textSecondary,
                          fontFamily: fonts.regular,
                        },
                      ]}
                    >
                      {isSilence ? '—' : '∞ Sonsuz'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: '75%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTextCol: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    letterSpacing: -0.01,
  },
  nowPlaying: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 6,
  },
  nowPlayingMuted: {
    fontSize: 13,
    marginTop: 6,
  },
  subtitle: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
    paddingHorizontal: 2,
  },
  volumeStrip: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
  },
  volumeTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  volumeFill: {
    height: '100%',
    borderRadius: 2,
  },
  scrollPad: {
    paddingBottom: 28,
  },
  tracksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  trackCard: {
    width: '47%',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  trackTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wavePlaceholder: {
    width: 15,
    height: BAR_BASE_H,
  },
  trackIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackName: {
    fontSize: 14,
  },
  trackDesc: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  durationLabel: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
});
