import _Vue, { ComponentOptions, WatchOptions } from 'vue'

interface CommonModule {
  [k: string]: any
}

type ListenerData = {
  type: string
  payload: any
} & {
  actionType: string
  payload: any
}

import { VueStoreOptions } from '../types'

interface StoreProto<Y> {
  addModule: <T>(path: string, _module: T) => T
  removeModule: (path: string) => void
  subscribe: (listener: (arg: ListenerData, state: Y) => any) => () => void
  replaceState: (state: CommonModule) => void
  watch<T>(fn: (this: Y) => T, cb: (value?: T, oldValue?: T) => void, options?: WatchOptions): () => void
  getState: () => any
  hotUpdate: (p: string | CommonModule, m: CommonModule) => any
}

let Vue!: typeof _Vue
const prefix = 'vuestore: '

function createVueStore<M extends CommonModule>(modules: M, option?: VueStoreOptions<M & StoreProto<M>>) {
  if (!Vue) {
    throw new Error(prefix + 'Please install VueStorePlugin first.')
  }
  let isCommitting = false
  let isGetting = false
  let isReplacing = false
  let subscribeName = ''
  const eventBus = new Vue()
  const base: StoreProto<M> = {
    addModule(path: string, _module: CommonModule) {
      const routes = path.split('.')
      const moduleName = routes.pop() as string
      let parentModule: any = store
      routes.forEach(r => {
        parentModule = parentModule[r]
      })
      Object.defineProperty(parentModule, moduleName, {
        value: _createStore(_module, routes.concat(moduleName))[0],
        enumerable: true,
        configurable: true // allow to delete dynamic module
      })
      return parentModule[moduleName]
    },
    removeModule(path: string) {
      'use strict';
      const routes = path.split('.')
      const moduleName = routes.pop() as string
      let parentModule: any = store
      routes.forEach(r => {
        parentModule = parentModule[r]
      })
      try {
        const vueIns = parentModule[moduleName].__vue__
        delete parentModule[moduleName]
        vueIns.$destroy()
      } catch {
        throw new Error(prefix + `Only dynamic module can be removed while ${path} is an initial module.`)
      }
    },
    subscribe(listener) {
      if (!subscribeName) {
        subscribeName = 'vuestore-mutation-action-subscribe-event'
      }
      const _listener = (data: ListenerData, state: M) => {
        listener(data, state)
      }
      eventBus.$on(subscribeName, _listener)
      return () => eventBus.$off(subscribeName, _listener)
    },
    replaceState(state, _store = store) {
      isReplacing = true
      const vueInstance: InstanceType<typeof _Vue> = _store.__vue__
      Object.keys(state).forEach(key => {
        if (/[A-Z]/.test(key[0])) {
          const replaceState: any = base.replaceState
          if (_store[key]) {
            replaceState(state[key], _store[key])
          } else {
            throw new Error(prefix + `Namespace sub module ${key} does not exist`)
          }
        } else { // avoid to trigger getter
          const getter = (Object.getOwnPropertyDescriptor(state, key) as PropertyDescriptor).get
          if (typeof getter !== 'function' && typeof state[key] !== 'function') {
            vueInstance.$set(vueInstance, key, state[key])
          }
        }
      })
      isReplacing = false
    },
    watch(fn, cb, option) {
      const getter = fn.bind(stateGetters)
      return eventBus.$watch(getter as any, cb, option)
    },
    getState() {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(prefix + 'Only use getState in development mode.')
      }
      return JSON.parse(JSON.stringify(state))
    },
    hotUpdate(path, _module) {
      const newModule = typeof path === 'string' ? _module : path
      const routesPath = typeof path === 'string' ? path : ''
      const routes = routesPath.split('/')
      let Module: CommonModule = store
      routes.forEach(r => {
        Module = Module[r]
      })
      Object.keys(Module.__module__).forEach(k => {
        if (typeof Module.__module__[k] === 'function') {
          delete Module.__module__[k]
        }
      })
      Object.keys(newModule).forEach(key => {
        if (/[A-Z]/.test(key[0])) {
          const hotUpdate: any = base.hotUpdate
          hotUpdate(routesPath + '/' + key, newModule[key])
        } else {
          const getter = (Object.getOwnPropertyDescriptor(newModule, key) as PropertyDescriptor).get
          if (typeof getter === 'function') {
            Module.__module__[key] = getter
          } else if (typeof newModule[key] === 'function') {
            Module.__module__[key] = newModule[key]
          }
        }
      })
    }
  }
  function _createStore<M extends CommonModule>(Modules: M, routes: string[] = []) {
    const Module: any = routes.length ? {} : Object.create(base)
    const state: CommonModule = {}
    const stateGetters: CommonModule = {}
    const vueOption: ComponentOptions<_Vue> & {
      __state__: any,
      __stateGetters__: any
    } = { __state__: state, __stateGetters__: stateGetters, data: {} }
    const routesPath = routes.join('/')
    Object.keys(Modules).forEach(key => {
      if (/[A-Z]/.test(key[0])) {
        if (!Modules[key]) return
        const [_Module, _state, _stateGetters] = _createStore(Modules[key], routes.concat(key))
        Object.defineProperty(Module, key, {
          value: _Module,
          enumerable: true,
          configurable: false
        })
        state[key] = _state
        stateGetters[key] = _stateGetters
      } else {
        const getter = (Object.getOwnPropertyDescriptor(Modules, key) as PropertyDescriptor).get
        if (typeof getter === 'function') {
          delete Modules[key]
          ;(Modules as any)[key] = getter
          vueOption.computed = vueOption.computed || {}
          vueOption.computed[key] = function () {
            isGetting = true
            const value = Modules[key].call(stateGetters)
            isGetting = false
            return value
          }
          const descriptor = {
            get() { return vueIns[key] },
            enumerable: true
          }
          Object.defineProperty(stateGetters, key, descriptor)
          Object.defineProperty(Module, key, descriptor)
        } else if (typeof Modules[key] === 'function') {
          vueOption.methods = vueOption.methods || {}
          if (key[0] === '$') {
            Module[key] = function (payload: any) {
              if (subscribeName) {
                eventBus.$emit(subscribeName, {
                  actionType: routesPath ? `${routesPath}/${key}` : key,
                  payload
                }, state)
              }
              return Modules[key].call(Module, payload)
            }
          } else {
            Module[key] = function (payload: any) {
              isCommitting = true
              if (subscribeName) {
                eventBus.$emit(subscribeName, {
                  type: routesPath ? `${routesPath}/${key}` : key,
                  payload
                }, state)
              }
              Modules[key].call(state, payload)
              isCommitting = false
            }
          }
        } else {
          (vueOption.data as any)[key] = Modules[key]
          const descriptor = {
            get() { return vueIns[key] },
            set(val: any) {
              vueIns[key] = val
            },
            enumerable: true
          }
          Object.defineProperty(state, key, descriptor)
          Object.defineProperty(stateGetters, key, descriptor)
          Object.defineProperty(Module, key, descriptor)
        }
      }
    })
    const vueIns: any = new Vue(vueOption)
    Object.defineProperty(Module, '__vue__', {
      value: vueIns
    })
    Object.defineProperty(Module, '__module__', {
      value: Modules,
    })
    return [Module, state, stateGetters]
  }
  const [_store, state, stateGetters] = _createStore(modules)
  const store = _store as (M & StoreProto<M>);
  if (option && option.strict) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(prefix + 'Only use strict option in development mode!')
    }
    eventBus.$watch(() => state, () => {
      if (!isCommitting && !isReplacing) {
        setTimeout(() => { // prevent vue to show error
          throw new Error(prefix + 'Only mutation could change state!')
        })
      }
    }, { deep: true, sync: true } as any)
  }
  if (option && Array.isArray(option.plugins)) {
    option.plugins.forEach(plugin => {
      typeof plugin === 'function' && plugin(store)
    })
  }
  return store
}

export default class VueStorePlugin {
  static install(vue: typeof _Vue) {
    if (Vue && Vue === vue) {
      console.warn(prefix + 'Do not install the plugin again.')
    }
    Vue = vue
    Vue.mixin({
      beforeCreate() {
        const options: any = this.$options
        if (options.store) {
        (this as any).$store = options.store
        } else if (options.parent && options.parent.$store) {
          (this as any).$store = options.parent.$store
        }
      }
    })
  }
  static createVueStore = createVueStore
}
