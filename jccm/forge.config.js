const path = require('path');

const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

console.log(`Current working directory: ${process.cwd()}`);

const entitlements = '/Users/srho/electron-test/juniper-jccm-project/jccm/entitlements.plist';
module.exports = {
    packagerConfig: {
        asar: true,
        icon: './assets/icons/AppIcon', // Path without the extension
        osxSign: {
            'hardened-runtime': true,
        },
        osxNotarize: {
            appleId: process.env.APPLE_ID,
            appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
            teamId: process.env.APPLE_DEVELOPER_TEAM_ID,
        },
    },
    rebuildConfig: {},
    makers: [
        {
            name: '@electron-forge/maker-pkg',
            config: {
                identity: 'Developer ID Installer: Simon Rho (9B54K458K9)',
                overwrite: true,
                out: path.join(__dirname, 'out/make/darwin-arm64'),
                name: 'jccm-darwin-arm64',
                icon: path.join(__dirname, 'assets/icons/AppIcon.icns'), // Use the same icon as for DMG
                arch: 'arm64'
            }
        },
        {
            name: '@electron-forge/maker-pkg',
            config: {
                identity: 'Developer ID Installer: Simon Rho (9B54K458K9)',
                overwrite: true,
                out: path.join(__dirname, 'out/make/darwin-x64'),
                name: 'jccm-darwin-x64',
                icon: path.join(__dirname, 'assets/icons/AppIcon.icns'), // Use the same icon as for DMG
                arch: 'x64'
            }
        },        
        {
            name: '@electron-forge/maker-squirrel',
            config: {
                iconUrl: `file://${path.resolve(__dirname, 'assets/icons/AppIcon.ico')}`, // Local file URL for Windows
                setupIcon: path.join(__dirname, 'assets/icons/AppIcon.ico'), // Path to the .ico file for Windows
                overwrite: true,
                out: path.join(__dirname, 'out/make/windows-x64'),
                name: 'jccm-windows-x64-setup',
                arch: 'x64', // Architecture for Windows
                // loadingGif: path.resolve(__dirname, 'assets/loading.gif'), // Path to a loading GIF
                setupExe: 'jccm-windows-x64-setup.exe', // Name for the setup executable
                setupMsi: 'jccm-windows-x64-setup.msi', // Name for the MSI installer
            },
        },
        {
            name: '@electron-forge/maker-deb',
            config: {
                arch: 'x64', // Architecture for Linux .deb
                icon: path.join(__dirname, 'assets/icons/AppIcon.png'), // Icon for Linux .deb (should be a PNG)
                overwrite: true,
                out: path.join(__dirname, 'out/make/linux-deb-x64'),
                name: 'jccm-linux-deb-x64',
            },
        },
        {
            name: '@electron-forge/maker-rpm',
            config: {
                arch: 'x64', // Architecture for Linux .rpm
                icon: path.join(__dirname, 'assets/icons/AppIcon.png'), // Icon for Linux .rpm (should be a PNG)
                overwrite: true,
                out: path.join(__dirname, 'out/make/linux-rpm-x64'),
                name: 'jccm-linux-rpm-x64',
            },
        },
        {
            name: '@electron-forge/maker-dmg',
            config: {
                icon: path.join(__dirname, 'assets/icons/AppIcon.icns'), // Icon for macOS DMG
                overwrite: true,
                format: 'ULFO', // Optional: Customize DMG format
                out: path.join(__dirname, 'out/make/darwin-arm64'),
                name: 'jccm-darwin-arm64',
                arch: 'arm64',
            },
        },
        {
            name: '@electron-forge/maker-dmg',
            config: {
                icon: path.join(__dirname, 'assets/icons/AppIcon.icns'), // Icon for macOS DMG
                overwrite: true,
                format: 'ULFO', // Optional: Customize DMG format
                out: path.join(__dirname, 'out/make/darwin-x64'),
                name: 'jccm-darwin-x64',
                arch: 'x64',
            },
        },
    ],
    plugins: [
        {
            name: '@electron-forge/plugin-auto-unpack-natives',
            config: {}, // No specific configuration needed
        },
        {
            name: '@electron-forge/plugin-webpack',
            config: {
                loggerPort: 9001, // conflicts with zscaler client using tcp port 9000
                mainConfig: './webpack.main.config.js',
                renderer: {
                    config: './webpack.renderer.config.js',
                    entryPoints: [
                        {
                            html: './src/index.html',
                            js: './src/renderer.js',
                            name: 'main_window',
                            preload: {
                                js: './src/preload.js',
                            },
                        },
                    ],
                },
            },
        },
        new FusesPlugin({
            version: FuseVersion.V1,
            [FuseV1Options.RunAsNode]: false,
            [FuseV1Options.EnableCookieEncryption]: true,
            [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
            [FuseV1Options.EnableNodeCliInspectArguments]: false,
            [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
            [FuseV1Options.OnlyLoadAppFromAsar]: true,
        }),
    ],
};
