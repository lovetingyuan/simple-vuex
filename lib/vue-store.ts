import _Vue, { ComponentOptions } from 'vue'

import { VueStoreOptions, CommonModule, StoreProto, AddModuleOption, ListenerData } from '../types/types'

let Vue!: typeof _Vue

function setFunction (target: { [k: string]: any }, name: string, func: (...a: any) => any): void {
  if (func.name !== name) {
    Object.defineProperty(func, 'name', { value: name })
  }
  target[name] = func
}

function onError (msg: string): never {
  throw new Error('vue-store error: ' + msg)
}

function onWarn (msg: string): void {
  console.warn('vue-store warn: ' + msg)
}

function createVueStore<M extends CommonModule> (modules: M, option?: VueStoreOptions<M & StoreProto<M>>): (M & StoreProto<M>) {
  if (!Vue) {
    onError('Please install VueStorePlugin first.')
  }
  let isCommitting = false
  let isReplacing = false
  let subscribeName = ''
  const eventBus = new Vue()
  const base: StoreProto<M> = {
    addModule<MM extends CommonModule> (path: string, _module: MM, options?: AddModuleOption): MM {
      const routes = path.split('.')
      options = options || {
        preserveState: true
      }
      const moduleName = routes.pop() as string
      let vueStore: any = store
      routes.forEach((r): void => { vueStore = vueStore[r] })
      const _state = {}
      if (vueStore[moduleName] && (options.preserveState || !('preserveState' in options))) {
        Object.assign(_state, vueStore[moduleName].__state__)
      }
      if (vueStore[moduleName] && vueStore[moduleName].__vue__) {
        onWarn(`${path} has been added, do not repeat to add it.`)
        return vueStore[moduleName]
      }
      vueStore[moduleName] = _createStore(_module, routes.concat(moduleName), _state)
      vueStore.__state__[moduleName] = vueStore[moduleName].__state__
      return vueStore[moduleName]
    },
    removeModule (path: string): void {
      'use strict'
      const routes = path.split('.')
      const moduleName = routes.pop() as string
      let vueStore: any = store
      routes.forEach((r): void => { vueStore = vueStore[r] })
      try {
        const vueIns = vueStore[moduleName].__vue__
        delete vueStore.__state__[moduleName]
        delete vueStore[moduleName]
        vueIns.$destroy()
      } catch {
        onError(`${path} can not be removed as it is not dynamic module.`)
      }
    },
    subscribe (listener): () => void {
      subscribeName = subscribeName || 'vuestore-mutation-action-subscribe-event'
      const _listener = (data: ListenerData, state: M): void => { listener(data, state) }
      eventBus.$on(subscribeName, _listener)
      return (): void => { eventBus.$off(subscribeName, _listener) }
    },
    replaceState (state: CommonModule, vueStore?: any): void {
      vueStore = vueStore || store
      Object.keys(state).forEach((key): void => {
        if (/[A-Z]/.test(key[0])) {
          if (vueStore[key]) {
            this.replaceState(state[key], vueStore[key])
          } else {
            vueStore[key] = {
              __state__: state[key]
            }
            vueStore.__state__[key] = state[key]
          }
        } else {
          isReplacing = true
          vueStore.__vue__[key] = state[key]
          isReplacing = false
        }
      })
    },
    watch (fn, cb, option): () => void {
      return eventBus.$watch(fn, cb, option)
    },
    getState (): object {
      if (process.env.NODE_ENV === 'production') {
        onWarn('Only call getState in development mode.')
      }
      return JSON.parse(JSON.stringify(store.__state__))
    },
    hotUpdate (path, _module): void {
      const newModule = typeof path === 'string' ? _module : path
      const routesPath = typeof path === 'string' ? path : ''
      const routes = routesPath.split('.')
      let vueStore: any = store
      routes.forEach((r): void => { vueStore = vueStore[r] })
      Object.keys(vueStore.__getters__).forEach((name): void => {
        delete vueStore.__getters__[name]
      })
      Object.keys(vueStore.__methods__).forEach((name): void => {
        delete vueStore.__methods__[name]
      })
      Object.keys(newModule).forEach((key): void => {
        if (/[A-Z]/.test(key[0])) {
          this.hotUpdate(routesPath + '.' + key, newModule[key])
        } else {
          const getter = (Object.getOwnPropertyDescriptor(newModule, key) as PropertyDescriptor).get
          if (typeof getter === 'function') {
            vueStore.__getters__[key] = getter
          } else if (typeof newModule[key] === 'function') {
            vueStore.__methods__[key] = newModule[key]
          }
        }
      })
    }
  }
  function _createStore<M extends CommonModule> (UserModule: M, routes: string[] = [], preservedState?: CommonModule): M {
    if (typeof UserModule === 'function') {
      UserModule = UserModule()
    }
    const Methods: any = {} // for hotUpdate, store functions
    const Getters: any = {}
    const state: CommonModule = {}
    const stateGetters: CommonModule = {}
    const vueStore: any = routes.length ? {} : Object.create(base)
    const vueOption: ComponentOptions<_Vue> = {}
    const routesPath = routes.join('/')
    Object.keys(UserModule).forEach((key): void => {
      if (/[A-Z]/.test(key[0])) {
        if (!UserModule[key]) return
        const _store = _createStore(UserModule[key], routes.concat(key))
        Object.defineProperty(vueStore, key, {
          value: _store,
          enumerable: true,
          configurable: false // prevent to be deleted
        })
        state[key] = _store.__state__
        stateGetters[key] = _store.__stateGetters__
      } else {
        const getter = (Object.getOwnPropertyDescriptor(UserModule, key) as PropertyDescriptor).get
        if (typeof getter === 'function') {
          Getters[key] = getter
          vueOption.computed = vueOption.computed || {}
          // eslint-disable-next-line
          setFunction(vueOption.computed, key, function (): any { // @typescript-eslint/promise-function-async??? why this lint error?
            return Getters[key].call(stateGetters)
          })
          const descriptor = {
            get (): any { return vueStore.__vue__[key] }, // eslint-disable-line
            enumerable: true
          }
          Object.defineProperty(stateGetters, key, descriptor)
          Object.defineProperty(vueStore, key, descriptor)
        } else if (typeof UserModule[key] === 'function') {
          Methods[key] = UserModule[key]
          setFunction(vueStore, key, key[0] === '$' ? function (payload: any): any { // eslint-disable-line
            if (subscribeName) {
              eventBus.$emit(subscribeName, {
                actionType: routesPath ? `${routesPath}/${key}` : key,
                payload
              }, state)
            }
            return Methods[key].call(vueStore, payload)
          } : function (payload: any): void {
            if (subscribeName) {
              eventBus.$emit(subscribeName, {
                type: routesPath ? `${routesPath}/${key}` : key,
                payload
              }, state)
            }
            isCommitting = true
            Methods[key].call(state, payload)
            isCommitting = false
          })
        } else {
          const data: any = (vueOption.data = vueOption.data || {})
          data[key] = (preservedState && (key in preservedState)) ? preservedState[key] : UserModule[key]
          const descriptor = {
            get (): any { return vueStore.__vue__[key] }, // eslint-disable-line
            set (val: any): void {
              vueStore.__vue__[key] = val
            },
            enumerable: true
          }
          Object.defineProperty(state, key, descriptor)
          Object.defineProperty(stateGetters, key, descriptor)
          Object.defineProperty(vueStore, key, descriptor)
        }
      }
    })
    Object.defineProperties(vueStore, {
      __vue__: { value: new Vue(vueOption) },
      __methods__: { value: Methods },
      __getters__: { value: Getters },
      __state__: { value: state },
      __stateGetters__: { value: stateGetters }
      // __path__: { value: routesPath },
      // __module__: { value: UserModule }
    })
    return vueStore
  }
  const store = _createStore(modules) as (M & StoreProto<M>)
  if (option && option.strict) {
    if (process.env.NODE_ENV === 'production') {
      onWarn('Only use strict option in development mode.')
    }
    eventBus.$watch((): object => store.__state__, (): void => {
      if (!isCommitting && !isReplacing) {
        eventBus.$nextTick((): void => { // prevent vue to show error
          onError('Only mutation could change state.')
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
      onWarn('Do not install the plugin again.')
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
