import Vue from 'vue'
import VueStore from '../../lib/vue-store'
// import devtoolPlugin from '../../lib/devtool'

Vue.use(VueStore)

import CounterModule from '@/modules/counterModule'
if (module.hot) {
  module.hot.accept('@/modules/counterModule', () => {
    store.hotUpdate('Counter', require('@/modules/counterModule').default)
  })
}

import { TodoModuleType } from '@/modules/todoListModule'

const store = VueStore.createStore({
  user: {
    name: 'tingyuan',
    age: 12
  },
  Counter: CounterModule,
  Todo: null as unknown as TodoModuleType
}, {
  strict: process.env.NODE_ENV === 'development',
  plugins: [
    // devtoolPlugin
  ]
})

export default store
