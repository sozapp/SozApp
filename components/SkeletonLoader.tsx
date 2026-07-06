import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, useColorScheme, View, type ViewStyle } from 'react-native';

export type SkeletonBoxProps = {
  width: number | string;
  height: number | string;
  borderRadius?: number;
  style?: ViewStyle;
};

const SHIMMER_DURATION = 1200;

export function SkeletonBox({
  width,
  height,
  borderRadius = 8,
  style,
}: SkeletonBoxProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: SHIMMER_DURATION / 2,
          useNativeDriver: false,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: SHIMMER_DURATION / 2,
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.8, 0.3],
  });

  const backgroundColor = isDark
    ? 'rgba(196,149,80,0.1)'
    : 'rgba(196,149,80,0.15)';

  return (
    <Animated.View
      style={[
        styles.box,
        {
          width,
          height,
          borderRadius,
          backgroundColor,
          opacity,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: {},
});
