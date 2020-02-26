import Vuex, { Module } from 'vuex'
import _Vue, { PluginFunction } from 'vue'
import { UserModule, Options, Base, VueStore } from './types'

let Vue: typeof _Vue

function createVuexStore<M extends UserModule> (modules: M, options: Options): VueStore<M> {
  const defaultStateGetter = (state: any, key: any): any => state[key]
  const stateGetterMap: { [k: string]: any } = {}
  const getStateGetter = (routes: readonly string[]): ((s: any, n: string) => any) | Function => {
    if (!routes.length) return defaultStateGetter
    const router: string = routes.join('.')
    if (!stateGetterMap[router]) {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
      stateGetterMap[router] = new Function('s', 'n', `return s.${router}[n]`)
    }
    return stateGetterMap[router]
  }
  function setState (vs: UserModule, key: string, routes: readonly string[]): void {
    const stateGetter = getStateGetter(routes)
    Object.defineProperty(vs, key, {
      enumerable: true,
      configurable: true,
      get () {
        return stateGetter(store.state, key)
      },
      set () {
        throw new Error('[vue-store]: do not mutate vuex store state outside mutation handlers.')
      }
    })
  }

  function findParent (router: string): [UserModule, string] {
    const routes = router.split('.')
    const moduleName = routes.pop() as string
    let _vuestore = vueStore
    routes.forEach((name, i) => {
      if (!_vuestore[name]) {
        throw new Error(`[vue-store]: nest module "${routes.slice(0, i).join('.')}" does not exist.`)
      }
      _vuestore = _vuestore[name]
    })
    return [_vuestore, moduleName]
  }

  function normalizeModule (userModule: UserModule, routes: readonly string[] = []): [Module<any, any>, UserModule] {
    'use strict'
    const vuexModule: Module<any, any> = {
      namespaced: true,
      state: {}
    }
    interface FuncMap { [k: string]: (...a: any) => any }
    const um: {
      g: FuncMap
      m: FuncMap
      a: FuncMap
    } = { g: {}, m: {}, a: {} }
    const vueModule: UserModule = {
      __um__: um
    }
    Object.keys(userModule).forEach(key => {
      const getter = (Object.getOwnPropertyDescriptor(userModule, key) as PropertyDescriptor).get
      const newRoutes = routes.concat(key).join('/')
      const firstCode = key.charCodeAt(0)
      if (firstCode >= 65 && firstCode <= 90) { // module
        if (!userModule[key] || typeof userModule[key] !== 'object') return
        const [nestVuexModule, nestVueModule] = normalizeModule(userModule[key], routes.concat(key))
        vuexModule.modules = vuexModule.modules ?? {}
        vuexModule.modules[key] = nestVuexModule
        vueModule[key] = nestVueModule
      } else if (typeof getter === 'function') { // getter
        vuexModule.getters = vuexModule.getters ?? {}
        um.g[key] = getter
        vuexModule.getters[key] = function (state, getters, rootState, rootGetters) {
          const getterState = Object.create(getters)
          Object.keys(state).forEach(k => {
            Object.defineProperty(getterState, k, {
              get () {
                return state[k]
              },
              enumerable: true,
              configurable: true
            })
          })
          return um.g[key].call(getterState)
        }
        const descriptor = {
          configurable: true,
          enumerable: true,
          get () {
            return store.getters[newRoutes]
          }
        }
        Object.defineProperty(vueModule, key, descriptor)
      } else if (firstCode === 36) { // action
        // eslint-disable-next-line eqeqeq
        if (userModule[key] == undefined) return
        vuexModule.actions = vuexModule.actions ?? {}
        um.a[key] = userModule[key]
        vuexModule.actions[key] = function (ctx, payload) {
          return um.a[key].call(vueModule, payload)
        }
        // eslint-disable-next-line @typescript-eslint/promise-function-async
        vueModule[key] = function (payload: any) {
          return store.dispatch(newRoutes, payload)
        }
      } else if (typeof userModule[key] === 'function') { // mutation
        vuexModule.mutations = vuexModule.mutations ?? {}
        um.m[key] = userModule[key]
        vuexModule.mutations[key] = function (state, payload) {
          um.m[key].call(state, payload)
        }
        vueModule[key] = function (payload: any) {
          store.commit(newRoutes, payload)
        }
      } else {
        vuexModule.state[key] = userModule[key]
        setState(vueModule, key, routes)
      }
    })
    return [vuexModule, vueModule]
  }

  const api: Base = {
    addModule (router, userModule) {
      const [_store, moduleName] = findParent(router)
      const routes = router.split('.')
      const [vuexOptions, nestVueStore] = normalizeModule(userModule, routes)
      store.registerModule(routes, vuexOptions)
      _store[moduleName] = nestVueStore
      Object.defineProperty(_store, moduleName, {
        value: nestVueStore,
        enumerable: true
      })
      return () => {
        'use strict'
        store.unregisterModule(routes)
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete _store[moduleName]
      }
    },
    subscribe (sub: any, action?: boolean) {
      if (action) {
        return store.subscribeAction(sub)
      }
      return store.subscribe(sub)
    },
    watch (fn, callback, options) {
      return store.watch(fn, callback, options)
    },
    getState (pure) {
      if (pure) {
        return JSON.parse(JSON.stringify(store.state))
      }
      return store.state
    },
    replaceState (newState, vs = vueStore, routes = []) {
      if (!newState || typeof newState !== 'object') return
      Object.keys(newState).forEach(key => {
        if (/[A-Z]/.test(key[0])) {
          vs[key] = vs[key] ?? {}
          api.replaceState(newState[key], vs[key], routes.concat(key))
        } else {
          setState(vs, key, routes)
        }
      })
      if (!routes.length) {
        store.replaceState(newState)
      }
    }
  }
  const [storeOptions, vueStore] = normalizeModule(modules)
  Vue.use(Vuex)
  const store = new Vuex.Store(Object.assign(storeOptions, options))
  api.$store = store
  Object.setPrototypeOf(vueStore, api)
  return vueStore as VueStore<M>
}

export const createStore = createVuexStore

const vuestoreplugin: PluginFunction<never> = (vue) => {
  if (Vue && Vue === vue) {
    console.warn('[vue-store]: Do not install the plugin again.')
  }
  Vue = vue
}

export default vuestoreplugin
