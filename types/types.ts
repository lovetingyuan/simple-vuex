import { WatchOptions } from 'vue'

export interface CommonModule {
  [k: string]: any
}

export type ListenerData = {
  type: string
  payload: any
} & {
  actionType: string
  payload: any
}

export interface StoreProto<Y> {
  addModule: <T>(path: string, _module: T, option?: AddModuleOption) => T
  removeModule: (path: string) => void
  subscribe: (listener: (arg: ListenerData, state: Y) => any) => () => void
  replaceState: (state: CommonModule) => void
  watch<T>(fn: () => T, cb: (value?: T, oldValue?: T) => void, options?: WatchOptions): () => void
  getState: () => any
  hotUpdate: (p: string | CommonModule, m: CommonModule) => any
}

export type VueStoreOptions<S> = {
  strict?: boolean
  plugins?: ((store: S) => any)[],
  devtools?: boolean
}

export interface AddModuleOption {
  preserveState?: boolean
}

export type CreateVueStore<M extends CommonModule> = (modules: M, option?: VueStoreOptions<M & StoreProto<M>>) => (M & StoreProto<M>)

