import { Dimensions, Platform } from 'react-native';

export function useDeviceType() {
  const { width, height } = Dimensions.get('window');
  const isIPad =
    Platform.OS === 'ios' && (Platform.isPad || Math.min(width, height) >= 768);
  const isLandscape = width > height;

  return {
    isIPad,
    isLandscape,
    isPhone: !isIPad,
    screenWidth: width,
    screenHeight: height,
    columns: isIPad ? (isLandscape ? 3 : 2) : 1,
  };
}
