const path = require('path');
const typescript = require('rollup-plugin-typescript');

module.exports = [
  {
    input: path.resolve(__dirname, 'index.ts'),
    output: {
      file: path.resolve(__dirname, 'dist/index.js'),
      format: 'umd',
      name: 'VueStorePlugin',
    }, 
    plugins: [
      typescript(),
    ],
  },
]
