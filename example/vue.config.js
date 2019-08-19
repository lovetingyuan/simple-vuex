const path = require('path')

module.exports = {
  lintOnSave: false,
  configureWebpack: {
    resolve: {
      alias: {
        'vue-store': path.join(__dirname, '../lib/vue-store.ts')
      },
      modules: [
        path.join(__dirname, '../lib')
      ]
    }
  }
}
