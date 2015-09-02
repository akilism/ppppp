var fs   = require('fs');
var path = require('path');

function getDirEntry(dirname) {
  dirname = path.resolve(dirname);
  return fs.readdirSync(dirname).filter(function(filename) {
    var subdirname = path.join(dirname, filename);
    var mainfile = path.join(subdirname, 'main.js');
    return (
      fs.lstatSync(subdirname).isDirectory() &&
      fs.existsSync(mainfile)
    );
  }).reduce(function(entry, subdirname) {
    entry[subdirname] = path.join(dirname, subdirname, 'main.js');
    return entry;
  }, {});
}

var loaders = [
  { test: /\.js$/,
    exclude: /(node_modules)/,
    loader: 'babel', },
  { test: /\.json$/,
    loader: 'json' },
  { test: /\.css$/,
    loader: 'style-loader!css-loader', },
  { test: /\.(png|jpg)$/,
    loader: 'url-loader?name=../output/[path][name].[ext]&limit=8192', },
  { test: /\.txt/,
    loader: 'raw-loader', },
];

var externals = {
  'google': 'google',
};

var devtool = 'cheap-module-source-map';

exports.lib = {
  entry: {
    'embed': './lib/embedComponent.js',
    'libgif': './lib/libgif.js'
  },

  module: { loaders: loaders },

  output: {
    path: __dirname,
    filename: 'build/main.js'
  },

  devtool: devtool,
};

exports.examples = {
  entry: getDirEntry('examples'),

  resolve: { fallback: ['./lib'] },

  module: { loaders: loaders },

  externals: externals,

  output: {
    path: __dirname,
    filename: 'examples/[name]/build/main.js',
  },

  devtool: devtool,
};
