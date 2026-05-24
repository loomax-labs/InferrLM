import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

type LiteRtIconProps = {
  size?: number;
  color?: string;
};

const LiteRtIcon = ({ size = 22, color = '#4285F4' }: LiteRtIconProps) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <Circle
      cx="13.722"
      cy="34.278"
      r="8.222"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M37.281 20.018a6.578 6.578 0 1 1-9.302-9.302l3.292-3.29a6.578 6.578 0 1 1 9.302 9.303zm4.317 21.58c-2.07 2.07-4.392-.074-7.32-.074s-5.25 2.145-7.32.074c-2.072-2.07.073-4.392.073-7.32s-2.145-5.25-.074-7.321c2.07-2.071 4.392.073 7.32.073s5.25-2.144 7.321-.073c2.071 2.07-.073 4.392-.073 7.32s2.144 5.25.073 7.32M13.722 5.5c1.443 0 2.451 1.092 3.7 1.814s2.7 1.048 3.421 2.297s.28 2.669.28 4.111s.441 2.862-.28 4.111c-.721 1.25-2.172 1.577-3.42 2.298s-2.258 1.813-3.7 1.813s-2.452-1.092-3.7-1.813s-2.7-1.049-3.421-2.298s-.28-2.669-.28-4.11s-.441-2.863.28-4.112c.72-1.249 2.171-1.576 3.42-2.297S12.28 5.5 13.722 5.5"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export default LiteRtIcon;
