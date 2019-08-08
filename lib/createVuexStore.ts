import Vue from 'vue'
import Vuex, { Store, Module, StoreOptions } from 'vuex'

interface Base<M> {
  addModule: (a: string, b: MyModule) => void
  removeModule: (a: string) => void
  watch: WatchOption
  subscribe: SubscribeOption
  subscribeAction: SubscribeActionOption
  $store: Store<any>
}

/**
  addModule: <T>(path: string, _module: T) => T
  removeModule: (path: string) => void
  subscribe: (listener: (arg: ListenerData, state: Y) => any) => () => void
  replaceState: (state: CommonModule) => void
  watch<T>(fn: (this: Y) => T, cb: (value?: T, oldValue?: T) => void, options?: WatchOptions): () => void
  getState: () => any
  hotUpdate: (p: string | CommonModule, m: CommonModule) => any
 */

interface MyModule {
  [k: string]: any
}

export type StoreType<M> = M & Base<M>

type Options = Pick<StoreOptions<any>, 'plugins' | 'strict'>

type WatchOption = Store<any>['watch']
type SubscribeOption = Store<any>['subscribe']
type SubscribeActionOption = Store<any>['subscribeAction']

export default function createVuexStore<M extends MyModule> (modules: M, options: Options) {
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
          get () {
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
        vuexModule.mutations[name] = function (state, payload) {
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
          stateGetter = function (state, name) { return state[name] }
        }
        const descriptor = {
          get () {
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
    get $store () { return store },
    watch (fn, callback, options) {
      return store.watch(fn.bind(patchedData), callback, options)
    },
    subscribe (sub) {
      return store.subscribe(sub)
    },
    subscribeAction (sub) {
      return store.subscribeAction(sub)
    },
    addModule (router, _module) {
      const routes = router.split('.')
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
    removeModule (router) {
      const routes = router.split('.')
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
  // Vue.prototype.$Store = patchedModule
  return patchedModule as StoreType<M>
}
