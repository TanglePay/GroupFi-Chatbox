const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: {
    server: './src/server.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js', // This ensures server.js and worker.js are created
    libraryTarget: 'commonjs2',
    clean: true, // Clean the dist folder before each build
  },
  target: 'node', // Ensures that the build is for Node.js
  externals: [nodeExternals(), 'fs/promises', 'path'], // Keep Node modules external
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: {
      '@iota/util.js': path.resolve(__dirname, 'node_modules/@iota/util.js/dist/esm/index-node.mjs'),
      '@iota/crypto.js': path.resolve(__dirname, 'node_modules/@iota/crypto.js/dist/esm/index-node.mjs'),
      '@iota/iota.js': path.resolve(__dirname, 'node_modules/@iota/iota.js/dist/esm/index-node.mjs'),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader', // Compile TypeScript to JavaScript
        exclude: /node_modules/,
      },
      {
        test: /\.json$/,
        type: 'javascript/auto', // Ensures JSON files can be required
        use: 'json-loader',
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'typeof window': JSON.stringify('undefined'),
      'window': JSON.stringify('undefined'),
    }),
  ],
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
  devtool: 'source-map', // Enable source maps for debugging
};
