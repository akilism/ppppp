var os = require('os');

module.exports = {
  entry: {
    'canvas': './canvas/index.js',
  },
  output: {
    path: __dirname,
    filename: 'output/[name].js',
  },
  module: {
    loaders: [
      { test: /\.js$/,
        exclude: /(node_modules)/,
        loader: 'babel', },
      { test: /\.css$/,
        loader: 'style-loader!css-loader', },
      { test: /\.(png|jpg)$/,
        loader: 'url-loader?limit=8192', },
      { test: /\.(ttf)$/,
        loader: 'file-loader?name=output/[path][name].[ext]', },
    ]
  },
  devtool: 'cheap-source-map',
};
