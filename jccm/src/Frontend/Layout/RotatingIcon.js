import React from 'react';

import { tokens } from '@fluentui/react-components';

export const RotatingIcon = ({ Icon, color = tokens.colorPaletteGreenBorder2, size = '15px', rotationDuration = '2s' }) => {
    const keyframesStyle = `
    @keyframes rotate {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  `;

    return (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <style>{keyframesStyle}</style>
            <Icon style={{ fontSize: size, color: color, animation: `rotate ${rotationDuration} linear infinite` }} />
        </div>
    );
};
