import Vue from 'vue'
import VueStore from '../../lib/vue-store'

Vue.use(VueStore)

import CounterModule from '@/modules/counterModule'
import TodoListModule from '@/modules/todoListModule'

const store = VueStore.createVueStore({
  user: {
    name: 'tingyuan',
    age: 12
  },
  Counter: CounterModule,
  Todo: TodoListModule
}, {
  strict: process.env.NODE_ENV === 'development'
})

Vue.prototype.$vueStore = store

export default store
