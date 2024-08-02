const webpack = require('webpack'); // Require webpack at the top
const rules = require('./webpack.rules');
const path = require('path');

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
        extensions: ['.js', '.jsx', '.json'],
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
    ],
    devServer: {
        contentBase: path.join(__dirname, 'dist'), // Output directory
        hot: true, // Enable HMR on the server
    },
    // Set target to 'web' for HMR to work properly
    target: 'web',
};
