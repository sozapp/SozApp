import React from 'react';
import Svg, { Line, Path, Circle } from 'react-native-svg';

type SozLogoProps = {
  size?: number;
  color?: string;
};

export function SozLogo({ size = 28, color = '#C4956A' }: SozLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Line x1="13" y1="11" x2="27" y2="11" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <Path
        d="M27 11 C27 11 13 11 13 20 C13 29 27 29 27 29"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <Line x1="13" y1="29" x2="27" y2="29" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <Circle cx="20" cy="20" r="2.5" fill={color} />
    </Svg>
  );
}
