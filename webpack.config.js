const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
module.exports = {
	mode: 'development',
	entry: './src/main.tsx',
	devtool: 'inline-source-map',
	devServer: {
		static: './dist'
	},
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: '[name].js',
		chunkFilename: '[name].js'
	},
	resolve: {
		extensions: ['.mjs', '.ts', '.tsx', '.js', '.jsx'],
		fallback: {
			crypto: false,
			path: false,
			stream: false,
			events: false,
			buffer: false,
			fs: false,
		}
	},
	module: {
		rules: [
			{
				test: /.(ts|tsx|js|jsx)$/,
				exclude: /node_modules/,
				loader: 'babel-loader',
				options: {
				  //plugins: ['lodash', '@babel/transform-runtime'],
				  presets: ['@babel/preset-env', ['@babel/preset-react', { runtime: 'automatic' }], '@babel/preset-typescript'],
				}
			},
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
			{
				test: /\.s[ac]ss$/i,
				use: [
				  // Creates `style` nodes from JS strings
				  "style-loader",
				  // Translates CSS into CommonJS
				  "css-loader",
				  // Compiles Sass to CSS
				  "sass-loader",
				],
			},
			{
				test: /\.(png|jpg|gif|svg|eot|ttf|woff)$/,
				use: [
					{
						loader: 'file-loader',
						options: {
							name: 'img/[name].[ext]'
						}
					},
				  ],
			},
		]
	},
	plugins:[
		new HtmlWebpackPlugin({
			filename: 'index.html',
			template: './src/index.html'
		}),
		new HtmlWebpackPlugin({
			filename: 'index-fr.html',
			template: './src/index-fr.html'
		}),
		new CopyWebpackPlugin({
			patterns: [
			  { from: "src/main-config.js", to: "main-config.js" },
			  { from: "src/main-config-dev.js", to: "main-config-dev.js" },
			  { from: "src/main-config-stage.js", to: "main-config-stage.js" },
			  { from: "src/main-config-prod.js", to: "main-config-prod.js" },
			]
		})
	]
}