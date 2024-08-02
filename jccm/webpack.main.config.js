const webpack = require('webpack');

module.exports = {
    /**
     * This is the main entry point for your application, it's the first file
     * that runs in the main process.
     */
    target: 'electron-main', // Ensures Webpack is aware this is for the Electron main process
    entry: './src/main.js',
    // Put your normal webpack config below here
    module: {
        rules: require('./webpack.rules'),
    },
    resolve: {
        extensions: ['.js', '.jsx', '.json'],
        fallback: {
            fs: false, // Tells Webpack to ignore 'fs' module
            path: require.resolve('path-browserify'), // Provides a polyfill for 'path'
            buffer: require.resolve('buffer/'), // Provides a polyfill for 'buffer'
            os: require.resolve('os-browserify/browser'), // Provides a polyfill for 'os'
        },
    },
    node: {
        __dirname: false, // It's often useful to not mess with __dirname in Electron
        __filename: false, // Same for __filename
    },
    plugins: [
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
        }),
    ],
};
