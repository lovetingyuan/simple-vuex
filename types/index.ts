import { VueStoreOptions, CreateVueStore } from './types'

import _Vue from 'vue'

type VueStorePlugin<T> = {
  install: (Vue: typeof _Vue) => void
  createStore: CreateVueStore<T>
}

export {
  VueStoreOptions
}

export default VueStorePlugin
