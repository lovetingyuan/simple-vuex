import Vue, { ComponentOptions } from 'vue'
import Vuex, { Store, Module, StoreOptions } from 'vuex'

interface Base<M> {
  addModule: (a: string, b: MyModule) => void
  removeModule: (a: string) => void
  watch: WatchOption
  subscribe: SubscribeOption
  subscribeAction: SubscribeActionOption
  $store: Store<any>
}

interface MyModule {
  [k: string]: any
}

export type StoreType<M> = M & Base<M>

type Options = Pick<StoreOptions<any>, 'plugins' | 'strict'>

type WatchOption = Store<any>['watch']
type SubscribeOption = Store<any>['subscribe']
type SubscribeActionOption = Store<any>['subscribeAction']

export function createVuexStore<M extends MyModule> (modules: M, options: Options) {
  function normalizeModule (mModule: MyModule, pModule: MyModule, pData: MyModule, routes: readonly string[] = []) {
    const vuexModule: Module<any, any> = {
      namespaced: true,
      state: {}
    }
    Object.keys(mModule).forEach(name => {
      const getter = (Object.getOwnPropertyDescriptor(mModule, name) as PropertyDescriptor).get
      const newRoutes = routes.concat(name).join('/')
      const firstCode = name.charCodeAt(0)
      if (firstCode >= 65 && firstCode <= 90) { // module
        const patchedM = {}
        const patchedD = {}
        const vuexM = normalizeModule(mModule[name], patchedM, patchedD, routes.concat(name))
        vuexModule.modules = vuexModule.modules || {}
        vuexModule.modules[name] = vuexM
        pModule[name] = patchedM
        pData[name] = patchedD
      } else if (typeof getter === 'function') { // getter
        vuexModule.getters = vuexModule.getters || {}
        vuexModule.getters[name] = function (state, getters, rootState, rootGetters) {
          return getter.call(pData)
        }
        const descriptor = {
          get() {
            return store.getters[newRoutes]
          }
        }
        Object.defineProperty(pModule, name, descriptor)
        Object.defineProperty(pData, name, descriptor)
      } else if (name[0] === '$') { // action
        vuexModule.actions = vuexModule.actions || {}
        vuexModule.actions[name] = function (ctx, payload) {
          return mModule[name].call(pModule, payload)
        }
        pModule[name] = function (payload: any) {
          return store.dispatch(newRoutes, payload)
        }
      } else if (typeof mModule[name] === 'function') { // mutation
        vuexModule.mutations = vuexModule.mutations || {}
        vuexModule.mutations[name] = function(state, payload) {
          mModule[name].call(state, payload)
        }
        pModule[name] = function (payload: any) {
          store.commit(newRoutes, payload)
        }
      } else {
        vuexModule.state[name] = mModule[name]
        let stateGetter!: ((s: any, n: string) => any) | Function
        if (routes.length) { // mean nested module
          stateGetter = new Function('s', 'n', `return s.${routes.join('.')}[n]`)
        } else {
          stateGetter = function(state, name) { return state[name] }
        }
        const descriptor = {
          get() {
            return stateGetter(store.state, name)
          }
        }
        Object.defineProperty(pModule, name, descriptor)
        Object.defineProperty(pData, name, descriptor)
      }
    })
    return vuexModule
  }
  const base: Base<M> = {
    get $store() { return store },
    watch(fn, callback, options) {
      return store.watch(fn.bind(patchedData), callback, options)
    },
    subscribe(sub) {
      return store.subscribe(sub)
    },
    subscribeAction(sub) {
      return store.subscribeAction(sub)
    },
    addModule(router, _module) {
      let routes = router.split('.')
      const key = routes.pop() as string
      let _patchedM = patchedModule
      let _patchedD = patchedData
      routes.forEach(r => {
        _patchedM = _patchedM[r]
        _patchedD = _patchedD[r]
      })
      _patchedM = _patchedM[key] = {}
      _patchedD = _patchedD[key] = {}
      const vuexM = normalizeModule(_module, _patchedM, _patchedD, routes.concat(key))
      store.registerModule(routes.concat(key), vuexM)
    },
    removeModule(router) {
      let routes = router.split('.')
      store.unregisterModule([...routes])
      const key = routes.pop() as string
      let _patchedM = patchedModule
      let _patchedD = patchedData
      routes.forEach(r => {
        _patchedM = _patchedM[r]
        _patchedD = _patchedD[r]
      })
      delete _patchedM[key]
      delete _patchedD[key]
    }
  }
  const patchedModule = Object.create(base)
  const patchedData: MyModule = {}
  const storeOptions = normalizeModule(modules, patchedModule, patchedData)
  Vue.use(Vuex)
  const store = new Vuex.Store(Object.assign(storeOptions, options))
  Vue.prototype.$Store = patchedModule
  return patchedModule as StoreType<M>
}

export function createVueStore<M extends MyModule>(modules: M) {
  let isCommitting = false
  let isGetting = false
  let subscribeName = ''
  const eventBus = new Vue()
  interface Base {
    addModule: <T>(path: string, _module: T) => T
    removeModule: (path: string) => void
    subscribe: (listener: (arg: SubData) => any) => () => void
    replaceState: (state: MyModule) => void
  }
  type SubData = {
    type: string
    payload: any
  } | {
    actionType: string
    payload: any
  }
  const base: Base = {
    addModule(path: string, _module: MyModule) {
      const routes = path.split('.')
      const moduleName = routes.pop() as string
      let parentModule: any = store
      routes.forEach(r => {
        parentModule = parentModule[r]
      })
      Object.defineProperty(parentModule, moduleName, {
        value: _createStore(_module, routes.concat(moduleName)),
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
      subscribeName = '$$store-mutation-event'
      const _listener = (data: SubData) => listener(data)
      eventBus.$on(subscribeName, _listener)
      return () => eventBus.$off(subscribeName, _listener)
    },
    replaceState(state, _store = store) {
      const vueInstance: Vue = _store.__vue__
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
    }
  }
  function _createStore<M extends MyModule>(Modules: M, routes: string[] = []) {
    const vueOption: ComponentOptions<Vue> = { data: {} }
    const Module: any = routes.length ? {} : Object.create(base)
    const state = {}
    const stateGetters = {}
    const routesPath = routes.join('/')
    Object.keys(Modules).forEach(key => {
      const getter = (Object.getOwnPropertyDescriptor(Modules, key) as PropertyDescriptor).get
      if (/[A-Z]/.test(key[0])) {
        Module[key] = _createStore(Modules[key], routes.concat(key))
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
            })
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
            subscribeName &&  eventBus.$emit(subscribeName, {
              type: routesPath ? `${routesPath}/${key}` : key,
              payload
            })
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
          set(val: any) { vueModule[key] = val },
          enumerable: true
        }
        Object.defineProperty(state, key, descriptor)
        Object.defineProperty(stateGetters, key, descriptor)
        Object.defineProperty(Module, key, descriptor)
      }
    })
    let vueModule: any = new Vue(vueOption)
    Object.defineProperty(Module, '__vue__', { value: vueModule })
    return Module as unknown as M
  }
  const store = _createStore(modules)
  return store as (M & Base)
}

