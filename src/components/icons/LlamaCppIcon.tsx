import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

type LlamaCppIconProps = {
  size?: number;
  color?: string;
  accentColor?: string;
  backgroundColor?: string;
  showBackground?: boolean;
};

const LlamaCppIcon = ({
  size = 22,
  color = '#FF8A1C',
  accentColor = '#FFB84D',
  backgroundColor = '#1B1323',
  showBackground = false,
}: LlamaCppIconProps) => (
  <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    {showBackground ? <Rect x="5" y="5" width="54" height="54" rx="16" fill={backgroundColor} /> : null}
    <Path
      d="M24 12C15.5 12 9 18.7 9 28.5V35.5C9 44.6 15.2 52 24 52H28"
      stroke={accentColor}
      strokeWidth="4.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M30 11L35 4.5L40 10.5V17L46 20.5L52 28L49.5 38L42 46L31 44.5L28 36L24 29.5H18L22.5 18.5L30 11Z"
      fill={color}
    />
    <Path d="M34.5 18L36.5 9.5L39 13.5L38.5 20.5Z" fill={accentColor} />
    <Path d="M38 25.5L44.5 26.5L47.8 29.4L41.6 31.4Z" fill={accentColor} />
    <Path d="M46.5 35L52 36.2L50 41.8Z" fill={accentColor} />
    <Path d="M44 46.5V54.5" stroke={accentColor} strokeWidth="4" strokeLinecap="round" />
    <Path d="M40 50.5H48" stroke={accentColor} strokeWidth="4" strokeLinecap="round" />
    <Path d="M53 42.5V48.5" stroke={accentColor} strokeWidth="4" strokeLinecap="round" />
    <Path d="M50 45.5H56" stroke={accentColor} strokeWidth="4" strokeLinecap="round" />
  </Svg>
);

export default LlamaCppIcon;