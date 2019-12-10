import _Vue from 'vue'

let Vue: typeof _Vue

interface UserModule {
  [k: string]: any
}

interface Options <T> {
  strict?: boolean
  plugins?: ((store: T) => any)[]
}

interface Listener {
  (arg: { type: string, payload: any, action: boolean }): void
}

function createVueStore <T extends UserModule, S extends (T & typeof apis)> (userModule: T, options?: Options<S>) {
  if (!Vue) {
    throw new Error('[vue-store]: Please install this plugin before creating store.')
  }
  let subscribeName: string
  let vue = new Vue()
  let isMutating = false
  let isReplacing = false
  let getterkey = ''
  if (!options) {
    options = {}
  }
  const apis = {
    watch: vue.$watch.bind(vue),
    subscribe (listener: Listener) {
      subscribeName = '__vue-store-subscribe__'
      vue.$on(subscribeName, listener)
      return () => {
        vue.$off(subscribeName, listener)
      }
    },
    getState (this: T, state: any = {}) {
      Object.keys(this).forEach(key => {
        getterkey = ''
        if (typeof this[key] !== 'function') {
          if (getterkey) {
            getterkey = ''
          } else {
            if (/[A-Z]/.test(key[0])) {
              state[key] = apis.getState.call(this[key])
            } else {
              state[key] = this[key]
            }
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
        if (!parentModule) {
          throw new Error(`[vue-store]: Nest module "${path}" does not exist at "${route}".`)
        }
      })
      if (!parentModule[ns]) {
        parentModule[ns] = parseModule(userModule, routes.concat(ns))
      }
    },
    removeModule (path: string) {
      'use strict';
      const routes = path.split('/')
      const ns = routes.pop() as string
      let parentModule = this as UserModule
      routes.forEach(route => {
        parentModule = parentModule[route]
        if (!parentModule) {
          throw new Error(`[vue-store]: Nest module "${path}" does not exist at "${route}".`)
        }
      })
      try {
        delete parentModule[ns]
      } catch (err) {
        throw new Error('[vue-store]: Only dynamic nest module can be removed, ' + path)
      }
    },
    replaceState (newState: UserModule, store: UserModule) {
      store = store || this
      isReplacing = true
      const stateMap: any = {}
      Object.keys(store).forEach(key => {
        getterkey = ''
        if (typeof store[key] !== 'function') {
          if (!getterkey) {
            if (!/[A-Z]/.test(key[0])) {
              stateMap[key] = true
            }
          } else {
            getterkey = ''
          }
        }
      })
      Object.keys(newState).forEach(key => {
        if (/[A-Z]/.test(key[0])) {
          apis.replaceState(newState[key], store[key])
        } else {
          if (stateMap[key]) {
            stateMap[key] = false
          }
          Vue.set(store, key, newState[key])
        }
      })
      Object.keys(stateMap).forEach(key => {
        if (stateMap[key]) {
          Vue.delete(store, key)
        }
      })
      isReplacing = false
    },
    hotUpdate (path: string, newModule: UserModule) {
      let store: UserModule = this
      const routes = path.split('/')
      const ns = routes.pop() as string
      routes.forEach(key => {
        store = store[key]
      })
      const maintainState = (target: any, source: any) => {
        Object.keys(target).forEach(key => {
          const desp = Object.getOwnPropertyDescriptor(target, key) as PropertyDescriptor
          if (!desp.get && typeof target[key] !== 'function') {
            if (/[A-Z]/.test(key[0])) {
              if (target[key] && source[key]) {
                maintainState(target[key], source[key])
              }
            } else {
              target[key] = source[key]
            }
          }
        })
      }
      maintainState(newModule, store[ns])
      store[ns] = parseModule(newModule, routes.concat(ns))
    }
  }

  function parseModule (userModule: UserModule, routes: string[] = []) {
    let store: any = routes.length ? {} : Object.create(apis)
    const subModules: UserModule = {} // delay to handle nest modules
    Object.keys(userModule).forEach(key => {
      const desp = Object.getOwnPropertyDescriptor(userModule, key) as PropertyDescriptor
      if (desp.get) {
        const getter = desp.get
        desp.get = function () {
          getterkey = key
          return getter.call(this)
        }
        Object.defineProperty(store, key, desp)
      } else if (typeof userModule[key] === 'function') {
        const method = userModule[key]
        if (key[0] === '$') { // action
          store[key] = function (payload: any) {
            subscribeName && vue.$emit(subscribeName, {
              type: routes.join('/') + '/' + key,
              action: true,
              payload
            })
            return Promise.resolve(method.call(this, payload))
          }
        } else { // mutation
          store[key] = function (payload: any) {
            subscribeName && vue.$emit(subscribeName, {
              type: routes.join('/') + '/' + key,
              action: false,
              payload
            })
            isMutating = true
            method.call(this, payload)
            isMutating = false
          }
        }
      } else if (/[A-Z]/.test(key[0])) {
        subModules[key] = userModule[key]
      } else {
        store[key] = userModule[key]
      }
    })
    store = Vue.observable(store)
    Object.keys(subModules).forEach(ns => {
      Object.defineProperty(store, ns, {
        value: parseModule(subModules[ns], routes.concat(ns)),
        configurable: false,
        enumerable: true,
        writable: true
      })
    })
    return store
  }

  if (process.env.NODE_ENV === 'production') {
    if (options.strict) {
      console.warn('[vue-store]: Do not use "strict" option in production mode.')
    }
  }
  const store = parseModule(userModule)

  if (options.strict) {
    vue.$watch((): any => store, (): void => {
      if (!isMutating && !isReplacing) {
        try {
          throw new Error('Only mutation(pure function) could change store.')
        } catch (err) {
          // prevent vue to show error
          setTimeout((): never => { throw err }, 0)
        }
      }
    }, { deep: true, sync: true } as any)
  }
  if (Array.isArray(options.plugins)) {
    options.plugins.forEach(plugin => {
      plugin(store)
    })
  }

  return store as S
}

export default {
  createStore: createVueStore,
  install (vue: typeof _Vue) {
    if (Vue && Vue === vue) {
      console.warn('[vue-store]: Do not install the plugin again.')
    }
    Vue = vue
    Vue.mixin({
      beforeCreate () {
        const options: any = this.$options
        if (options.store) {
          (this as any).$store = options.store
        } else if (options.parent && options.parent.$store) {
          (this as any).$store = options.parent.$store
        }
      }
    })
  }
}
