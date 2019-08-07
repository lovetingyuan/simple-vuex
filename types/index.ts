export type VueStoreOptions<S> = {
  strict?: boolean
  plugins?: ((store: S) => any)[],
  devtools?: boolean
}
