import { useCallback } from 'react';

import {
    webLightTheme,
    teamsDarkTheme,
    teamsLightTheme,
    webDarkTheme,
    teamsHighContrastTheme,
} from '@fluentui/react-components';

export const AppTitle = 'Juniper Cloud Connection Manager';
export const HeaderSpaceHeight = 45;
export const LeftSideSpaceWidth = 600;
export const RightSideSpaceWidth = 200;
export const FooterSpaceHeight = 35;
export const LoginCardWidth = 600;
export const LoginCardHeight = 600;

export const sharedInventoryWindowWidth = 1000;
export const sharedInventoryWindowHeight = 500;

export const InventorySearchWindowWidth = 1000;
export const InventorySearchWindowHeight = 700;

export const Themes = {
    webLightTheme: { theme: webLightTheme, description: 'Web Light' },
    webDarkTheme: { theme: webDarkTheme, description: 'Web Dark' },
    teamsLightTheme: { theme: teamsLightTheme, description: 'Teams Light' },
    teamsDarkTheme: { theme: teamsDarkTheme, description: 'Teams Dark' },
    teamsHighContrastTheme: { theme: teamsHighContrastTheme, description: 'Teams High Contrast' },
};

export const getActiveTheme = (themeName) => {
    return Themes[themeName] || Themes.webLightTheme;
};

export const getActiveThemeName = (themeName) => {
    return Themes[themeName] ? themeName : 'webLightTheme';
};

export const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        console.log('Text copied to clipboard');
    } catch (err) {
        console.error('Failed to copy text to clipboard', err);
    }
};

export const capitalizeFirstChar = (str) => {
    if (!str) return str; // return the original string if it's empty
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};
