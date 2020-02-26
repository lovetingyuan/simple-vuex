import Vue from 'vue'
import VueStore, { createStore } from '../../index'

import CounterModule from '@/modules/counterModule'

import { TodoModuleType } from '@/modules/todoListModule'

Vue.use(VueStore)
// if (module.hot) {
//   module.hot.accept('@/modules/counterModule', () => {
//     store.hotUpdate('Counter', require('@/modules/counterModule').default)
//   })
// }

const store = createStore({
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
    // (function() {
    //   const target = typeof window !== 'undefined'
    //     ? window
    //     : typeof global !== 'undefined'
    //       ? global
    //       : {}
    //   const devtoolHook = target.__VUE_DEVTOOLS_GLOBAL_HOOK__

    //   return function devtoolPlugin (store) {
    //     if (!devtoolHook) return

    //     store._devtoolHook = devtoolHook

    //     devtoolHook.emit('vuex:init', store)

    //     devtoolHook.on('vuex:travel-to-state', targetState => {
    //       store.replaceState(targetState)
    //     })

    //     store.subscribe(({ type, payload }, state) => {
    //       type && devtoolHook.emit('vuex:mutation', {
    //         type, payload
    //       }, state)
    //     })
    //   }
    // })()
  ]
})

// store.replaceState({
//   Todo: {
//     list: [
//       {
//         text: 'init item',
//         done: false,
//         id: 23728
//       },
//       {
//         text: 'init item',
//         done: false,
//         id: 523452
//       }
//     ]
//   }
// })

if (process.env.NODE_ENV === 'development') {
  Object.defineProperty(window, '_store', { value: store })
}

export default store
