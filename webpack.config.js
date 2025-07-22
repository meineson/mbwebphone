const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: {
    mbphone: './mbphone.js'
  },
  // devtool: 'inline-source-map',
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, './')
  },optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      test: /\.js(\?.*)?$/i,
      parallel: true,
      terserOptions: {
        compress: {
          arrows: true, 
          comparisons: false, 
        },
        mangle: true
      },
      extractComments: false, 
    })],
  }
};