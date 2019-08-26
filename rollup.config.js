const typescript = require('rollup-plugin-typescript')
const replace = require('rollup-plugin-replace')
const { terser } = require('rollup-plugin-terser')
const pkg = require('./package.json')

module.exports = [
  {
    input: 'index.ts',
    output: {
      file: 'dist/vue-store.common.js',
      format: 'cjs',
      indent: false
    },
    external: [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {})
    ],
    plugins: [
      typescript()
    ]
  },
  {
    input: 'index.ts',
    output: {
      file: 'dist/vue-store.js',
      format: 'umd',
      name: 'VueStore',
      indent: false
    },
    plugins: [
      typescript(),
      replace({
        'process.env.NODE_ENV': null // remove process for umd
      })
    ]
  },
  {
    input: 'index.ts',
    output: {
      file: 'dist/vue-store.min.js',
      format: 'umd',
      name: 'VueStore',
      indent: false
    },
    plugins: [
      typescript(),
      replace({
        'process.env.NODE_ENV': null
      }),
      terser()
    ]
  },
  {
    input: 'index.ts',
    output: {
      file: 'dist/vue-store.esm.js',
      format: 'es',
      indent: false
    },
    plugins: [
      typescript()
    ]
  },
  {
    input: 'index.ts',
    output: {
      file: 'dist/vue-store.esm.browser.js',
      format: 'es',
      indent: false
    },
    plugins: [
      typescript({
        target: 'es6'
      }),
      replace({
        'process.env.NODE_ENV': null
      })
    ]
  }
]
