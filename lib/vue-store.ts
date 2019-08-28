import _Vue from 'vue'

import { VueStoreOptions, CommonModule, StoreProto, AddModuleOption, ListenerData, NormalizedModule } from '../types/types'

let Vue!: typeof _Vue

function setFunction (target: object, name: string, func: (...a: any) => any): void {
  if (func.name !== name) {
    Object.defineProperty(func, 'name', { value: name })
  }
  target[name] = func
}

function onError (msg: string): never {
  throw new Error('[vue-store] error: ' + msg)
}

function onWarn (msg: string): void {
  console.warn('[vue-store] warn: ' + msg)
}

function isCapital (val: any): boolean {
  if (!val) return false
  return /[A-Z]/.test(val[0])
}

function isObject (val: any): boolean {
  return ({}).toString.apply(val) === '[object Object]' && Object(val) === val
}

function normalizeModule (userModule: CommonModule, routes: string[] = [], target?: any): NormalizedModule {
  if (typeof userModule === 'function') {
    userModule = userModule()
  }
  const normalized: NormalizedModule = {
    state: {}, getters: {}, mutations: {}, actions: {}, subModules: {}, routes: [...routes]
  }
  Object.keys(userModule).forEach((name): void => {
    if (isCapital(name)) {
      if (userModule[name]) {
        normalized.subModules[name] = normalizeModule(userModule[name], routes.concat(name), target ? target[name] : null)
      }
    } else {
      const getter = (Object.getOwnPropertyDescriptor(userModule, name) as PropertyDescriptor).get
      if (typeof getter === 'function') {
        normalized.getters[name] = getter
      } else if (typeof userModule[name] === 'function') {
        normalized[name[0] === '$' ? 'actions' : 'mutations'][name] = userModule[name]
      } else {
        if (target) {
          normalized.state[name] = target[name]
        } else {
          normalized.state[name] = userModule[name]
        }
      }
    }
  })
  return normalized
}

const STORE_META = '__VUE_STORE_META__'

function createVueStore<M extends CommonModule> (modules: M, options?: VueStoreOptions<M & StoreProto<M>>): (M & StoreProto<M>) {
  if (!Vue) {
    onError('Please install vue-store plugin first.')
  }
  let isCommitting = false
  let isReplacing = false
  let subscribeName = ''
  const _vm = new Vue()
  const strict = options ? options.strict : false
  const base: StoreProto<M> = {
    addModule<MM extends CommonModule> (path: string, userModule: MM, options?: AddModuleOption): MM {
      if (process.env.NODE_ENV !== 'production') {
        if (
          typeof path !== 'string' ||
          !path.split('.').length ||
          !userModule ||
          !isObject(userModule)
        ) {
          onError('Invalid parameters for "store.addModule".')
        }
        const routes = path.split('.')
        let target = store
        routes.forEach((r, i): void => {
          if (!isCapital(r)) {
            onError(`module name must start with capital letter, but received "${r}"`)
          }
          if (i !== routes.length - 1) {
            target = target[r]
            if (!target || !target.__vue__) {
              onError(`module "${r}" does not exist, please add it first.`)
            }
          } else {
            if (target[r] && target[r].__vue__) {
              onWarn(`module "${path}" has been added, please do not repeat to add it.`)
            }
          }
        })
      }
      const routes = path.split('.')
      options = options || {
        preserveState: true
      }
      const moduleName = routes.pop() as string
      let target: any = store
      routes.forEach((r): void => { target = target[r] })
      if (target[moduleName] && target[moduleName].__vue__) {
        return target[moduleName]
      }
      const normalizedModule = normalizeModule(userModule)
      if (target[moduleName] && (options.preserveState || !('preserveState' in options))) {
        const vueIns = target[moduleName].__vue__
        normalizedModule.state = Object.assign({}, vueIns ? vueIns[STORE_META].state : target[moduleName])
      }
      target[moduleName] = _createVueStore(normalizedModule)
      target[moduleName].__vue__[STORE_META].dynamic = true
      target.__vue__[STORE_META].state[moduleName] = target[moduleName].__vue__[STORE_META].state
      target.__vue__[STORE_META].stateGetters[moduleName] = target[moduleName].__vue__[STORE_META].stateGetters
      return target[moduleName]
    },
    removeModule (path: string): void {
      if (process.env.NODE_ENV !== 'production') {
        if (
          typeof path !== 'string' ||
          !path.split('.').length
        ) {
          onError('Invalid parameters for "store.removeModule".')
        }
        const routes = path.split('.')
        let target = store
        routes.forEach((r, i): void => {
          if (!isCapital(r)) {
            onError(`Module name "${r}" must start with capital letter.`)
          }
          target = target[r]
          if (!target || !target.__vue__) {
            onError(`Namespaced module "${r}" does not exist.`)
          }
          if (i === routes.length - 1 && !target.__vue__[STORE_META].dynamic) {
            onError(`Namespaced module "${path}" can not be removed as it is not dynamic module.`)
          }
        })
      }
      const routes = path.split('.')
      const moduleName = routes.pop() as string
      let target: any = store
      routes.forEach((r): void => { target = target[r] })
      const vueIns = target[moduleName].__vue__
      vueIns.$destroy()
      delete target[moduleName]
      delete target.__vue__[STORE_META].state[moduleName]
      delete target.__vue__[STORE_META].stateGetters[moduleName]
    },
    subscribe (listener): () => void {
      if (process.env.NODE_ENV !== 'production') {
        if (typeof listener !== 'function') {
          onError('listener callback passed to "store.subscribe" must be a function.')
        }
      }
      subscribeName = subscribeName || 'vuestore-mutation-action-subscribe-event'
      const _listener = (data: ListenerData, state: M): void => { listener(data, state) }
      _vm.$on(subscribeName, _listener)
      return (): void => { _vm.$off(subscribeName, _listener) }
    },
    replaceState (state: CommonModule, target?: any, routes?: string[]): void {
      target = target || store
      Object.keys(state).forEach((name): void => {
        if (isCapital(name)) {
          const newRoutes = (routes || []).concat(name)
          if (target[name] && target[name].__vue__) {
            this.replaceState(state[name], target[name], newRoutes)
          } else {
            Object.assign(target[name], state[name])
          }
        } else {
          isReplacing = true
          target.__vue__[name] = state[name]
          isReplacing = false
        }
      })
    },
    watch (fn, cb, option): () => void {
      if (process.env.NODE_ENV !== 'production') {
        if (typeof fn !== 'function' || typeof cb !== 'function') {
          onError('Invalid parameters passed to "store.watch".')
        }
      }
      return _vm.$watch(fn, cb, option)
    },
    getState (): object {
      if (process.env.NODE_ENV === 'production') {
        onWarn('Only call getState in development mode.')
      }
      return JSON.parse(JSON.stringify(store.__vue__[STORE_META].state))
    },
    hotUpdate (path, hotModule): void {
      if (process.env.NODE_ENV !== 'production') {
        if (
          (typeof path === 'string' && !isObject(hotModule)) ||
          !isObject(path)
        ) {
          onError(`Invalid parameters passed to "store.hotUpdate".`)
        }
        const routes = path.split('.')
        let target: any = store
        routes.forEach((route: string): void => {
          if (!isCapital(route)) {
            onError(`Module name "${route}" must start with capital letter.`)
          }
          if (!target[route]) {
            onError(`module ${path} do not exists.`)
          }
          target = target[route]
        })
      }
      if (typeof path !== 'string') {
        hotModule = path
        path = ''
      }
      let target: any = store
      let routes: string[] = []
      if (path) {
        routes = path.split('.')
        routes.forEach((route): void => {
          target = target[route]
        })
      }
      const normalizedModule = normalizeModule(hotModule, routes)
      target.__vue__[STORE_META].getters = normalizedModule.getters
      target.__vue__[STORE_META].mutations = normalizedModule.mutations
      target.__vue__[STORE_META].actions = normalizedModule.actions
    }
  }

  function _createVueStore (normalizedModule: NormalizedModule): any {
    const { state: data, getters, mutations, actions, subModules, routes } = normalizedModule
    const vueStore: any = routes.length ? {} : Object.create(base)
    const state = {}
    const stateGetters = Object.create(state)
    const vueOptions = {
      data: {},
      computed: {},
      methods: {}
    }
    Object.keys(data).forEach((name): void => {
      vueOptions.data[name] = data[name]
      const descriptor = {
        get (): any {
          return vueStore.__vue__[name]
        },
        set (val: any): void {
          vueStore.__vue__[name] = val
        },
        enumerable: true
      }
      Object.defineProperty(vueStore, name, descriptor)
      Object.defineProperty(state, name, descriptor)
    })
    Object.keys(getters).forEach((name): void => {
      vueOptions.computed[name] = function (): any {
        return vueStore.__vue__[STORE_META].getters[name].call(stateGetters)
      }
      const descriptor = {
        get (): any {
          return vueStore.__vue__[name]
        },
        enumerable: true
      }
      Object.defineProperty(vueStore, name, descriptor)
      Object.defineProperty(stateGetters, name, descriptor)
    })
    Object.keys(mutations).forEach((name): void => {
      vueOptions.methods[name] = function (payload: any): void {
        vueStore.__vue__[STORE_META].mutations[name].call(state, payload)
      }
      setFunction(vueStore, name, (payload: any): void => {
        isCommitting = true
        vueStore.__vue__[name](payload)
        isCommitting = false
        subscribeName && _vm.$emit(subscribeName, {
          type: routes.join('.'),
          payload
        }, state)
      })
    })
    Object.keys(actions).forEach((name): void => {
      vueOptions.methods[name] = function (payload: any): any {
        return vueStore.__vue__[STORE_META].actions[name].call(vueStore, payload)
      }
      setFunction(vueStore, name, (payload: any): any => {
        const promise = vueStore.__vue__[name](payload)
        return Promise.resolve(promise).then((res): any => {
          subscribeName && _vm.$emit(subscribeName, {
            actionType: routes.join('.'),
            payload
          }, state)
          return res
        })
      })
    })
    Object.keys(subModules).forEach((name): void => {
      vueStore[name] = _createVueStore(subModules[name])
      state[name] = vueStore[name].__vue__[STORE_META].state
      stateGetters[name] = vueStore[name].__vue__[STORE_META].stateGetters
    })
    Object.defineProperty(vueStore, '__vue__', { value: new Vue(vueOptions) })
    Object.defineProperty(vueStore.__vue__, STORE_META, {
      value: {
        state, stateGetters, getters, mutations, actions
      }
    })
    if (strict) {
      vueStore.__vue__.$watch((): any => state, (): void => { // eslint-disable-line
        if (!isCommitting && !isReplacing) {
          try {
            onError('Only mutation(pure function) could change store.')
          } catch (err) {
            // prevent vue to show error
            setTimeout((): never => { throw err }, 0)
          }
        }
      }, { deep: true, sync: true } as any)
    }
    return vueStore
  }

  if (process.env.NODE_ENV === 'production') {
    if (strict) {
      onWarn('Only use strict option in development mode.')
    }
  } else {
    if (!isObject(modules)) {
      onError('modules must be plain object.')
    }
  }
  const normalizedModule = normalizeModule(modules)
  const store = _createVueStore(normalizedModule) as (M & StoreProto<M>)
  if (options && Array.isArray(options.plugins)) {
    options.plugins.forEach((plugin: any): void => {
      if (typeof plugin === 'function') {
        plugin(store)
      } else if (process.env.NODE_ENV !== 'production') {
        onError(`vue store plugin ${plugin} must be function.`)
      }
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
