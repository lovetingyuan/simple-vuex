const modules = {
  user: {
    name: 'tingyuan'
  },
  setName(n?: string) {
    console.log('setName', this)
    this.user.name = n || this.user.name.toUpperCase()
  },
  Todo: {
    list: [] as string[],
    get count() {
      console.log('get count',Object.keys(this))
      return this.list.length
    },
    setList(list: string[]) {
      console.log('setlist',Object.keys(this))
      this.list = list
    },
    addItem(t: string) {
      console.log('additem',Object.keys(this))
      this.list.push(t)
    },
    $test() {

    },
    $fetchList() {
      console.log('$fetchlist',Object.keys(this))
      setTimeout(() => {
        this.setList(['111', '2222'])
      }, 2000);
    },

  }
}

import VueStorePlugin from '../../../lib/createVueStore'
import Vue from 'vue'

Vue.use(VueStorePlugin)

export default VueStorePlugin.createVueStore(modules, {
  strict: process.env.NODE_ENV === 'development'
})
