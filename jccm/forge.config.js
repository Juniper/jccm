const path = require('path');

const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

console.log(`Current working directory: ${process.cwd()}`);

let platformOption;
let archOption;

module.exports = {
    packagerConfig: {
        appBundleId: 'net.juniper.juniper-cloud-connection-manager',
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
    rebuildConfig: { force: true },
    makers: [
        {
            name: '@electron-forge/maker-pkg',
            platforms: ['darwin'],
            config: {
                icon: path.join(__dirname, 'assets/icons/AppIcon.icns'), // Icon for macOS DMG
                format: 'ULFO', // Optional: Customize DMG format
                overwrite: true,
            },
        },
        {
            name: '@electron-forge/maker-dmg',
            platforms: ['darwin'],
            config: {
                icon: path.join(__dirname, 'assets/icons/AppIcon.icns'), // Icon for macOS DMG
                format: 'ULFO', // Optional: Customize DMG format
                overwrite: true,
            },
        },
        {
            name: '@electron-forge/maker-zip',
            platforms: ['darwin'],
            config: {
                icon: path.join(__dirname, 'assets/icons/AppIcon.icns'), // Icon for macOS DMG
                format: 'ULFO', // Optional: Customize DMG format
                overwrite: true,
            },
        },
        {
            name: '@electron-forge/maker-squirrel',
            config: {
                iconUrl: `file://${path.resolve(
                    __dirname,
                    'assets/icons/AppIcon.ico'
                )}`, // Local file URL for Windows
                setupIcon: path.join(__dirname, 'assets/icons/AppIcon.ico'), // Path to the .ico file for Windows
                overwrite: true,
                out: path.join(__dirname, 'out/make/windows-x64'),
                name: 'jccm-windows-x64-setup',
                arch: 'x64',
                setupExe: 'jccm-windows-x64-setup.exe', // Name for the setup executable
                noMsi: true,
            },
        },
        {
            name: '@electron-forge/maker-deb',
            config: {
                icon: path.join(__dirname, 'assets/icons/AppIcon.png'),
                overwrite: true,
                out: path.join(__dirname, 'out/make'),
                arch: 'x64',
                bin: '', // Important note: Use an empty bin name due to a mismatch issue where the Electron app binary path could not be found.
                desktopTemplate: path.join(__dirname, 'jccm.desktop'), // Specify the custom desktop file
                scripts: {
                    postinst: 'scripts/postinst.sh',
                },
            },
        },
        {
            name: '@electron-forge/maker-rpm',
            config: {
                icon: path.join(__dirname, 'assets/icons/AppIcon.png'),
                overwrite: true,
                out: path.join(__dirname, 'out/make'),
                arch: 'x64',
                bin: '', // Important note: Use an empty bin name due to a mismatch issue where the Electron app binary path could not be found.
                desktopTemplate: path.join(__dirname, 'jccm.desktop'), // Specify the custom desktop file
            },
        },
    ],
    hooks: {
        generateAssets: async (config, platform, arch) => {
            platformOption = platform ? platform : process.platform;
            archOption = arch ? arch : process.arch;
        },
        preMake: async (config) => {
            const makerPkg = config.makers.find(
                (maker) => maker.name === '@electron-forge/maker-pkg'
            );
            const makerDmg = config.makers.find(
                (maker) => maker.name === '@electron-forge/maker-dmg'
            );

            const name = `jccm-darwin-${archOption}`;

            // Update the name in the maker's config to reflect the architecture passed in via the CLI
            makerPkg.config.name = name;
            makerDmg.config.name = name;
        },
    },
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
