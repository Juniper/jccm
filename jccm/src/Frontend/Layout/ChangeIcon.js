import React from 'react';

import { tokens } from '@fluentui/react-components';

export const RotatingIcon = ({
    Icon,
    color = tokens.colorPaletteGreenBorder2,
    size = '15px',
    rotationDuration = '2s',
}) => {
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

export const CircleIcon = ({ Icon, color = tokens.colorPaletteGreenBorder2, size = '12px', iconSize = '' }) => {
    return (
        <div
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: `calc(${size} + 2px)`,
                height: `calc(${size} + 2px)`,
                borderRadius: '50%',
                border: `0.5px solid ${color}`,
            }}
        >
            <Icon style={{ fontSize: iconSize.length === 0? size : iconSize, color: color }} />
        </div>
    );
};

export const OverlappingIcons = ({ Icon, color = tokens.colorPaletteGreenBorder2, size = '12px' }) => {
    const boxStyle = {
        position: 'absolute',
        top: 0,
        left: 0,
    };

    const containerStyle = {
        position: 'relative',
        width: `calc(${size} + 2px)`,
        height: `calc(${size} + 2px)`,
    };

    return (
        <div style={containerStyle}>
            <Icon style={{ ...boxStyle, fontSize: size, color: color, transform: 'translate(0px, 0px)' }} />
            <Icon style={{ ...boxStyle, fontSize: size, color: color, transform: 'translate(2px, 2px)' }} />
            <Icon style={{ ...boxStyle, fontSize: size, color: color, transform: 'translate(4px, 4px)' }} />
        </div>
    );
};
