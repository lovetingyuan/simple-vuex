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

type VueStoreOptions<S> = {
  strict?: boolean
  plugins?: ((store: S) => any)[]
}

interface StoreProto<Y> {
  addModule: <T>(path: string, _module: T) => T
  removeModule: (path: string) => void
  subscribe: (listener: (arg: ListenerData, state: Y) => any) => () => void
  replaceState: (state: CommonModule) => void
  watch<T>(fn: (this: Y) => T, cb: (value?: T, oldValue?: T) => void, options?: WatchOptions): () => void
  getState: () => any
}

let Vue!: typeof _Vue

function createVueStore<M extends CommonModule>(modules: M, option?: VueStoreOptions<M & StoreProto<M>>) {
  if (!Vue) {
    throw new Error('please install VueStorePlugin first.')
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
        configurable: true
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
      parentModule[moduleName].__vue__.$destroy()
      delete parentModule[moduleName]
    },
    subscribe(listener) {
      subscribeName = 'vue-store-mutation-action-event'
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
            throw new Error(`sub module ${key} not exist`)
          }
        } else {
          vueInstance.$set(vueInstance, key, state[key])
        }
      })
      isReplacing = false
    },
    watch(fn, cb, option) {
      const getter = fn.bind(stateGetters)
      return eventBus.$watch(getter as any, cb, option)
    },
    getState() {
      if (process.env.NODE_ENV !== 'development') {
        console.warn('Only use getState in development mode.')
      }
      return JSON.parse(JSON.stringify(state))
    }
  }
  function _createStore<M extends CommonModule>(Modules: M, routes: string[] = []) {
    const vueOption: ComponentOptions<_Vue> = { data: {} }
    const Module: any = routes.length ? {} : Object.create(base)
    const state: CommonModule = {}
    const stateGetters: CommonModule = {}
    const routesPath = routes.join('/')
    Object.keys(Modules).forEach(key => {
      const getter = (Object.getOwnPropertyDescriptor(Modules, key) as PropertyDescriptor).get
      if (/[A-Z]/.test(key[0])) {
        const [_Module, _state, _stateGetters] = _createStore(Modules[key], routes.concat(key))
        Module[key] = _Module
        state[key] = _state
        stateGetters[key] = _stateGetters
      } else if (typeof getter === 'function') {
        vueOption.computed = vueOption.computed || {}
        vueOption.computed[key] = function () {
          if (isCommitting) {
            throw new Error(`do not call getter ${key} in mutation`)
          }
          isGetting = true
          const ret = getter.call(stateGetters)
          isGetting = false
          return ret
        }
        const descriptor = {
          get() { return vueModule[key] },
          enumerable: true
        }
        Object.defineProperty(stateGetters, key, descriptor)
        Object.defineProperty(Module, key, descriptor)
      } else if (typeof Modules[key] === 'function') {
        vueOption.methods = vueOption.methods || {}
        if (key[0] === '$') {
          vueOption.methods[key] = function (payload: any) {
            if (isCommitting) {
              throw new Error(`do not call action ${routes.join('.')}.${key} in mutation`)
            }
            if (isGetting) {
              throw new Error(`do not call action ${routes.join('.')}.${key} in getter`)
            }
            subscribeName && eventBus.$emit(subscribeName, {
              actionType: routesPath ? `${routesPath}/${key}` : key,
              payload
            }, state)
            return Modules[key].call(Module, payload)
          }
          Module[key] = function (payload: any) {
            return vueModule[key](payload)
          }
        } else {
          vueOption.methods[key] = function (payload: any) {
            if (isGetting) {
              throw new Error(`do not call mutation ${key} in getter`)
            }
            isCommitting = true
            subscribeName && eventBus.$emit(subscribeName, {
              type: routesPath ? `${routesPath}/${key}` : key,
              payload
            }, state)
            Modules[key].call(state, payload)
            isCommitting = false
          }
          Module[key] = function (payload: any) {
            vueModule[key](payload)
          }
        }
      } else {
        (vueOption.data as any)[key] = Modules[key]
        const descriptor = {
          get() { return vueModule[key] },
          set(val: any) {
            vueModule[key] = val
          },
          enumerable: true
        }
        Object.defineProperty(state, key, descriptor)
        Object.defineProperty(stateGetters, key, descriptor)
        Object.defineProperty(Module, key, descriptor)
      }
    })
    let vueModule: any = new Vue(vueOption)
    Object.defineProperty(Module, '__vue__', { value: vueModule })
    return [Module, state, stateGetters]
  }
  const [_store, state, stateGetters] = _createStore(modules)
  const store = _store as (M & StoreProto<M>);
  if (option && option.strict) {
    if (process.env.NODE_ENV !== 'development') {
      console.warn('Only use strict option in development mode.')
    }
    eventBus.$watch(() => state, () => {
      if (!isCommitting && !isReplacing) {
        throw new Error('Only mutation could change state.')
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
      console.warn('do not repeat to install this plugin.')
    }
    Vue = vue
  }
  static createVueStore = createVueStore
}
