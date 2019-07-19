import Vue from 'vue'
import VueStore from '../../lib/vue-store'

Vue.use(VueStore)

import CounterModule from '@/modules/counterModule'
import { TodoModuleType } from '@/modules/todoListModule'

const store = VueStore.createVueStore({
  user: {
    name: 'tingyuan',
    age: 12
  },
  Counter: CounterModule,
  Todo: null as unknown as TodoModuleType
}, {
  strict: process.env.NODE_ENV === 'development'
})

export default store
