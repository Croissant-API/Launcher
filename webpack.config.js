const path = require('path');

const CONFIG = {
  mode: "development",
  devtool: false,

  entry: {
    app: "./src/index.js"
  },

  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, 'build')
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              "@babel/preset-env"
            ],
            plugins: [
              "@babel/plugin-proposal-class-properties"
            ]
          }
        }
      }
    ]
  }
};

module.exports = CONFIG;