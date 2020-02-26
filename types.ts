import { Store, StoreOptions } from 'vuex'

export interface Base {
  addModule: (r: string, m: UserModule) => () => void
  watch: Store<any>['watch']
  subscribe(fn: Parameters<Store<any>['subscribe']>[0]): ReturnType<Store<any>['subscribe']>
  subscribe(fn: Parameters<Store<any>['subscribeAction']>[0], action: boolean): ReturnType<Store<any>['subscribeAction']>
  $store?: Store<any>
  getState: (p?: boolean) => object
  replaceState: (s: UserModule, st?: UserModule, routes?: string[]) => void
  // hotUpdate: (r: string, m: UserModule) => void
}

export interface UserModule {
  [k: string]: any
}

export type VueStore<M> = M & Base

export type Options = Pick<StoreOptions<any>, 'plugins' | 'strict'>
