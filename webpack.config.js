module.exports = {
  entry: {
    './react-svg/packed': './react-svg/index.js',
    './canvas/packed': './canvas/index.js',
  },
  output: {
    path: __dirname,
    filename: '[name].js'
  },
  module: {
    loaders: [
      { test: /\.js$/,
        exclude: /(node_modules)/,
        loader: 'babel', },
      { test: /\.css$/, loader: 'style-loader!css-loader', },
      { test: /\.(png|jpg)$/, loader: 'url-loader?limit=8192', },
    ]
  },
  devtool: 'cheap-module-eval-source-map',
};
