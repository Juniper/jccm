const webpack = require('webpack'); // Require webpack at the top
const rules = require('./webpack.rules');
const path = require('path');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

rules.push({
    test: /\.svg$/,
    use: 'svg-inline-loader',
});

rules.push({
    test: /\.css$/,
    use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

module.exports = {
    // Specify the development mode for better debugging and HMR support
    mode: 'development',
    module: {
        rules,
    },
    resolve: {
        extensions: ['.js', '.jsx', '.json', '.yml', '.yaml'], // Resolve these extensions
        fallback: {
            fs: false, // Tells Webpack to ignore 'fs' module
            path: require.resolve('path-browserify'), // Provides a polyfill for 'path'
            buffer: require.resolve('buffer/'), // Provides a polyfill for 'buffer'
            os: require.resolve('os-browserify/browser'), // Provides a polyfill for 'os'
        },
    },
    plugins: [
        new webpack.HotModuleReplacementPlugin(), // Add the Hot Module Replacement plugin
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
        }),
        new MonacoWebpackPlugin(),
        // new webpack.ContextReplacementPlugin( // Resolve issues with dynamic require() calls that Webpack cannot statically analyze
        //     /monaco-editor(\\|\/)esm(\\|\/)vs(\\|\/)editor(\\|\/)common(\\|\/)services/
        // ),
    ],
    ignoreWarnings: [
        {
            message: /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/
        }
    ],
    devServer: {
        contentBase: path.join(__dirname, 'dist'), // Output directory
        hot: true, // Enable HMR on the server
        host: '127.0.0.1', // Bind to IPv4 address
        allowedHosts: [
            '127.0.0.1'
        ],
    },
    // Set target to 'web' for HMR to work properly
    target: 'web',
};
