import Vue from 'vue'

interface UserModule {
  [k: string]: any
}

type WatchParams = Parameters<Vue['$watch']>

interface Options {
  strict?: boolean
}

interface Listener {
  (arg: { type: string, payload: any, action: boolean }): void
}

interface ModuleMeta {
  methods: {
    [k: string]: (payload?: any) => any
  },
  statekeys: string[],
  dynamic?: boolean
}

export default function createStore <T extends UserModule> (userModule: T, options?: Options) {
  let subscribeName: string
  let vue = new Vue()
  let isMutating = false
  let isReplacing = false
  const MM = '__MODULE_META__'
  const apis = {
    watch (this: T, getter: WatchParams[0], callback: WatchParams[1]) {
      return vue.$watch(getter, callback)
    },
    subscribe (listener: Listener) {
      subscribeName = '__vue-store-subscribe__'
      vue.$on(subscribeName, listener)
      return () => {
        vue.$off(subscribeName, listener)
      }
    },
    getState (this: T, state: any = {}) {
      Object.keys(this).forEach(key => {
        const desp = Object.getOwnPropertyDescriptor(this, key) as PropertyDescriptor
        if (!desp.get && typeof this[key] !== 'function') {
          if (/[A-Z]/.test(key[0])) {
            state[key] = apis.getState.call(this[key])
          } else {
            state[key] = this[key]
          }
        }
      })
      return JSON.parse(JSON.stringify(state))
    },
    addModule (path: string, userModule: UserModule) {
      const routes = path.split('/')
      const ns = routes.pop() as string
      let parentModule = this as UserModule
      routes.forEach(route => {
        parentModule = parentModule[route]
      })
      parentModule[ns] = parseModule(userModule, routes.concat(ns))
      parentModule[ns][MM].dynamic = true
    },
    removeModule (path: string) {
      const routes = path.split('/')
      const ns = routes.pop() as string
      let parentModule = this as UserModule
      routes.forEach(route => {
        parentModule = parentModule[route]
      })
      if (parentModule[MM].dynamic) {
        delete parentModule[ns]
      }
    },
    replaceState (newState: UserModule, store: UserModule) {
      store = store || this
      isReplacing = true
      Object.keys(store).forEach(key => {
        const desp = Object.getOwnPropertyDescriptor(store, key) as PropertyDescriptor
        if (!desp.get && typeof store[key] !== 'function') {
          Vue.delete(store, key)
        }
      })
      Object.keys(newState).forEach(key => {
        if (/[A-Z]/.test(key[0])) {
          apis.replaceState(newState[key], store[key])
        } else {
          Vue.set(store, key, newState[key])
        }
      })
      isReplacing = false
    },
    hotUpdate (path: string, newModule: UserModule) {
      let store: UserModule = this
      path.split('/').forEach(key => {
        store = store[key]
      })
      Object.keys(newModule).forEach(key => {
        const desp = Object.getOwnPropertyDescriptor(newModule, key) as PropertyDescriptor
        if (desp.get) {
          store[MM].methods[key] = desp.get
        } else if (typeof newModule[key] === 'function') {
          store[MM].methods[key] = newModule[key]
        }
      })
    }
  }

  function parseModule (userModule: UserModule, routes: string[] = []) {
    let store: any = routes.length ? {} : Object.create(apis)
    const keys = Object.keys(userModule)
    const moduleMeta: ModuleMeta = {
      methods: {},
      statekeys: [],
    }
    const subModules: UserModule = {}
    keys.forEach(key => {
      const desp = Object.getOwnPropertyDescriptor(userModule, key) as PropertyDescriptor
      if (desp.get) {
        moduleMeta.methods[key] = desp.get
        desp.get = function () {
          return moduleMeta.methods[key].call(this)
        }
        Object.defineProperty(store, key, desp)
      } else if (typeof userModule[key] === 'function') {
        moduleMeta.methods[key] = userModule[key]
        if (key[0] === '$') { // action
          store[key] = function (payload: any) {
            subscribeName && vue.$emit(subscribeName, {
              type: routes.join('/') + '/' + key,
              action: true,
              payload
            })
            return Promise.resolve(
              moduleMeta.methods[key].call(this, payload)
            )
          }
        } else { // mutation
          store[key] = function (payload: any) {
            subscribeName && vue.$emit(subscribeName, {
              type: routes.join('/') + '/' + key,
              action: false,
              payload
            })
            isMutating = true
            moduleMeta.methods[key].call(this, payload)
            isMutating = false
          }
        }
      } else if (/[A-Z]/.test(key[0])) {
        subModules[key] = userModule[key]
      } else {
        moduleMeta.statekeys.push(key)
        store[key] = userModule[key]
      }
    })
    store = Vue.observable(store)
    Object.keys(subModules).forEach(ns => {
      store[ns] = parseModule(subModules[ns], routes.concat(ns))
    })
    store[MM] = moduleMeta
    return store
  }

  const store = parseModule(userModule)
  return (store as unknown) as (T & typeof apis)
}
