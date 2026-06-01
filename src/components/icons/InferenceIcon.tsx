import React from 'react';
import Svg, { Path } from 'react-native-svg';

type InferenceIconProps = {
  size?: number;
  color?: string;
};

const InferenceIcon = ({ size = 22, color = '#000000' }: InferenceIconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
      fill={color}
    />
  </Svg>
);

export default InferenceIcon;
