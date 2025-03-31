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

export const EmptySiteName = '~~ Site Not Assigned ~~';

export const Themes = {
    webLightTheme: { theme: webLightTheme, description: 'Web Light' },
    webDarkTheme: { theme: webDarkTheme, description: 'Web Dark' },
    teamsLightTheme: { theme: teamsLightTheme, description: 'Teams Light' },
    teamsDarkTheme: { theme: teamsDarkTheme, description: 'Teams Dark' },
    teamsHighContrastTheme: { theme: teamsHighContrastTheme, description: 'Teams High Contrast' },
};

export const xtermDefaultOptions = {
    minFontSize: 5,
    maxFontSize: 32,
    defaultFontSize: 12,
};

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const sleep = delay;

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

export const cliShortcutDataSchema = {
    type: 'object',
    properties: {
        mappings: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'The name of the command mapping',
                    },
                    commands: {
                        type: 'array',
                        items: {
                            type: 'string',
                            description: 'A CLI command string',
                        },
                        minItems: 1,
                        description: 'List of CLI commands for the mapping',
                    },
                },
                required: ['name', 'commands'],
                additionalProperties: false,
            },
        },
    },
    required: ['mappings'],
    additionalProperties: false,
};

export const defaultCliShortcutData = `#
# CLI Commands Mapping
# This YAML data maps CLI commands to their respective shortcuts.
# You can view command shortcuts and run them using the right-click context menu in the shell terminal.
# The format is as follows in YAML:
#   mappings:
#     - name: <name1>
#       commands:
#         - <CLI command1>
#         - <CLI command2>
#         - ...
#     - name: <name2>
#       ...
#
# The sleep <time> keyword pauses execution for milliseconds before the next command.
# For example, 'sleep 500' pauses for 500 milliseconds.
# \${device-address} is a placeholder for the device's address.
# \${oc-term-hostname} is a placeholder for the oc-term.
# \${jsi-term-hostname} is a placeholder for the jsi-term hostname.
# \${outbound-ssh-hostname} is a placeholder for the oc-term or jsi-term hostname, depending on the logged-in service.
#
mappings:
  - name: System Information
    commands:
      - show system information
  - name: Chassis MAC-Addresses
    commands:
      - show chassis mac-addresses
  - name: Hardware Information
    commands:
      - show chassis hardware | no-more
  - name: Name Server Configuration
    commands:
      - show configuration system name-server | display inheritance
  - name: Outbound-SSH Session
    commands:
      - show system connection | match \\.2200
  - name: Outbound-SSH Configuration
    commands:
      - show configuration system service outbound-ssh
  - name: Outbound-SSH Config and Session
    commands:
      - show configuration system service outbound-ssh
      - sleep 500
      - show system connection | match \\.2200
  - name: Route to Device Address
    commands:
      - show route \${device-address}
  - name: Route to outbound-ssh target host
    commands:
      - show route \${outbound-ssh-hostname}
  - name: Ping outbound-ssh target host
    commands:
      - ping \${outbound-ssh-hostname} inet count 3 wait 1
  - name: Telnet to outbound-ssh target host
    commands:
      - telnet \${outbound-ssh-hostname} inet port 2200
`;
