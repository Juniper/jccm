import React from 'react';
import googleLogo from '../../assets/google_logo.svg';

const GoogleIcon = ({ disabled, ...props }) => (
    <span
        {...props}
        dangerouslySetInnerHTML={{ __html: googleLogo }}
        style={{
            display: 'inline-block',
            width: '16px',
            height: '16px',
            filter: disabled ? 'grayscale(100%)' : 'none',
            opacity: disabled ? 0.5 : 1,
            pointerEvents: disabled ? 'none' : 'auto',
        }}
    />
);

export default GoogleIcon;
