var os = require('os');

module.exports = {
  entry: {
    'holcomb': './holcomb/index.js',
    'scroll': './scroll/index.js',
  },
  externals: {
    'google': 'google',
  },
  module: {
    loaders: [
      { test: /\.js$/,
        exclude: /(node_modules)/,
        loader: 'babel', },
      { test: /\.json$/,
        loader: 'json' },
      { test: /\.css$/,
        loader: 'style-loader!css-loader', },
      { test: /\.(png|jpg)$/,
        loader: 'url-loader?limit=8192', },
      { test: /\.(ttf)$/,
        loader: 'file-loader?name=output/[path][name].[ext]', },
      { test: /\.txt/,
        loader: 'raw-loader', },
    ]
  },
  output: {
    path: __dirname,
    filename: 'output/[name].js',
  },
  devtool: 'cheap-module-source-map',
};
