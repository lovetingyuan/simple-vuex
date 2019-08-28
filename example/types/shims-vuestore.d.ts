import store from '../src/store'
import Vue, { ComponentOptions } from 'vue'

declare module 'vue/types/options' {
  interface ComponentOptions<V extends Vue> {
    store?: typeof store
  }
}

declare module 'vue/types/vue' {
  interface Vue {
    $store: typeof store
  }
}
