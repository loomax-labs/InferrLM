import React from 'react';
import Svg, { Path } from 'react-native-svg';

type MlxIconProps = {
  size?: number;
  color?: string;
  secondaryColor?: string;
};

const MlxIcon = ({ size = 22, color, secondaryColor }: MlxIconProps) => {
  const mlColor = color ?? '#111111';
  const xColor = secondaryColor ?? (color !== undefined ? color : '#CCCCCC');

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" fill="none">
      <Path
        d="M40 140H86L124 285L162 140H200V372H160V229L126 372H117L80 229V372H40V140Z"
        fill={mlColor}
      />
      <Path d="M230 140H270V340H382V372H230V140Z" fill={mlColor} />
      <Path
        d="M342 140H388L427 204L467 140H512L452 256L512 372H466L427 308L388 372H342L402 256L342 140Z"
        fill={xColor}
      />
    </Svg>
  );
};

export default MlxIcon;