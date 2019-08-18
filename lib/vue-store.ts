import _Vue, { ComponentOptions, WatchOptions } from 'vue'

import { VueStoreOptions } from '../types'

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

function setFunction (target: { [k: string]: any }, name: string, func: (...a: any) => any): void {
  target[name] = ({
    [name]: func
  })[name]
}

function createVueStore<M extends CommonModule> (modules: M, option?: VueStoreOptions<M & StoreProto<M>>): (M & StoreProto<M>) {
  if (!Vue) {
    throw new Error(prefix + 'Please install VueStorePlugin first.')
  }
  let isCommitting = false
  let isReplacing = false
  let subscribeName = ''
  const eventBus = new Vue()
  const base: StoreProto<M> = {
    addModule<MM extends CommonModule> (path: string, _module: MM): MM {
      const routes = path.split('.')
      const moduleName = routes.pop() as string
      let parentModule: any = store
      routes.forEach((r): void => {
        parentModule = parentModule[r]
      })
      Object.defineProperty(parentModule, moduleName, {
        value: _createStore(_module, routes.concat(moduleName))[0],
        enumerable: true,
        configurable: true // allow to delete dynamic module
      })
      return parentModule[moduleName]
    },
    removeModule (path: string): void {
      'use strict'
      const routes = path.split('.')
      const moduleName = routes.pop() as string
      let parentModule: any = store
      routes.forEach((r): void => {
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
    subscribe (listener): () => void {
      if (!subscribeName) {
        subscribeName = 'vuestore-mutation-action-subscribe-event'
      }
      const _listener = (data: ListenerData, state: M): void => { listener(data, state) }
      eventBus.$on(subscribeName, _listener)
      return (): void => { eventBus.$off(subscribeName, _listener) }
    },
    replaceState (state, _store = store): void {
      isReplacing = true
      const vueInstance: InstanceType<typeof _Vue> = _store.__vue__
      Object.keys(state).forEach((key): void => {
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
    watch (fn, cb, option): () => void {
      const getter = fn.bind(stateGetters)
      return eventBus.$watch(getter as any, cb, option)
    },
    getState (): object {
      if (process.env.NODE_ENV === 'production') {
        console.warn(prefix + 'Only use getState in development mode.')
      }
      return JSON.parse(JSON.stringify(state))
    },
    hotUpdate (path, _module): void {
      const newModule = typeof path === 'string' ? _module : path
      const routesPath = typeof path === 'string' ? path : ''
      const routes = routesPath.split('/')
      let Module: CommonModule = store
      routes.forEach((r): void => {
        Module = Module[r]
      })
      Object.keys(Module.__module__).forEach((k): void => {
        if (typeof Module.__module__[k] === 'function') {
          delete Module.__module__[k]
        }
      })
      Object.keys(newModule).forEach((key): void => {
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
  function _createStore<M extends CommonModule> (Modules: M, routes: string[] = []): M[] {
    if (typeof Modules === 'function') {
      Modules = Modules()
    }
    const ModulesCopy: any = {} // for hotUpdate, store functions
    const Module: any = routes.length ? {} : Object.create(base)
    const state: CommonModule = {}
    const stateGetters: CommonModule = {}
    const vueOption: ComponentOptions<_Vue> = {}
    const routesPath = routes.join('/')
    Object.keys(Modules).forEach((key): void => {
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
          ModulesCopy[key] = getter
          vueOption.computed = vueOption.computed || {}
          vueOption.computed[key] = function (): any { // eslint-disable-line
            return ModulesCopy[key].call(stateGetters)
          }
          const descriptor = {
            get (): any { return vueIns[key] }, // eslint-disable-line
            enumerable: true
          }
          Object.defineProperty(stateGetters, key, descriptor)
          Object.defineProperty(Module, key, descriptor)
        } else if (typeof Modules[key] === 'function') {
          ModulesCopy[key] = Modules[key]
          setFunction(Module, key, key[0] === '$' ? function (payload: any): any { // eslint-disable-line
            if (subscribeName) {
              eventBus.$emit(subscribeName, {
                actionType: routesPath ? `${routesPath}/${key}` : key,
                payload
              }, state)
            }
            return ModulesCopy[key].call(Module, payload)
          } : function (payload: any): void {
            isCommitting = true
            if (subscribeName) {
              eventBus.$emit(subscribeName, {
                type: routesPath ? `${routesPath}/${key}` : key,
                payload
              }, state)
            }
            ModulesCopy[key].call(state, payload)
            isCommitting = false
          })
        } else {
          const data: any = vueOption.data = vueOption.data || {}
          data[key] = Modules[key]
          const descriptor = {
            get (): any { return vueIns[key] }, // eslint-disable-line
            set (val: any): void {
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
    Object.defineProperties(Module, {
      __vue__: { value: vueIns },
      __module__: { value: ModulesCopy }
    })
    return [Module, state, stateGetters]
  }
  const [_store, state, stateGetters] = _createStore(modules)
  const store = _store as (M & StoreProto<M>)
  if (option && option.strict) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(prefix + 'Only use strict option in development mode!')
    }
    eventBus.$watch((): object => state, (): void => {
      if (!isCommitting && !isReplacing) {
        setTimeout((): never => { // prevent vue to show error
          throw new Error(prefix + 'Only mutation could change state!')
        })
      }
    }, { deep: true, sync: true } as any)
  }
  if (option && Array.isArray(option.plugins)) {
    option.plugins.forEach((plugin: any): void => {
      typeof plugin === 'function' && plugin(store)
    })
  }
  return store
}

export default {
  install (vue: typeof _Vue): void {
    if (Vue && Vue === vue) {
      console.warn(prefix + 'Do not install the plugin again.')
    }
    Vue = vue
    Vue.mixin({
      beforeCreate (): void {
        const options: any = this.$options
        if (options.store) {
          (this as any).$store = options.store
        } else if (options.parent && options.parent.$store) {
          (this as any).$store = options.parent.$store
        }
      }
    })
  },
  createStore: createVueStore
}
