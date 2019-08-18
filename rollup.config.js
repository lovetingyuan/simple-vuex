const path = require('path')
const typescript = require('rollup-plugin-typescript')
const replace = require('rollup-plugin-replace')
const { terser } = require('rollup-plugin-terser')
const pkg = require('./package.json')

module.exports = [
  // CommonJS
  {
    input: 'index.ts',
    output: { file: 'dist/index.common.js', format: 'cjs', indent: false },
    external: [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {})
    ],
    plugins: [
      typescript()
    ]
  },
  {
    input: path.resolve(__dirname, 'index.ts'),
    output: {
      file: path.resolve(__dirname, 'dist/index.umd.js'),
      format: 'umd',
      name: 'VueStorePlugin',
      indent: false
    },
    plugins: [
      typescript(),
      replace({
        'process.env.NODE_ENV': JSON.stringify('development')
      })
    ]
  },
  {
    input: path.resolve(__dirname, 'index.ts'),
    output: {
      file: path.resolve(__dirname, 'dist/index.umd.min.js'),
      format: 'umd',
      name: 'VueStorePlugin',
      indent: false
    },
    plugins: [
      typescript(),
      replace({
        'process.env.NODE_ENV': JSON.stringify('development')
      }),
      terser()
    ]
  },
  {
    input: path.resolve(__dirname, 'index.ts'),
    output: {
      file: path.resolve(__dirname, 'dist/index.esm.js'),
      format: 'es',
      indent: false
    },
    plugins: [
      typescript()
    ]
  }
]
