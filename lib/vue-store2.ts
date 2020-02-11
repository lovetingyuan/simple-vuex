import VueType from 'vue'
let Vue!: typeof VueType

const base = {
  watch (getter: () => any, callback: () => any) {

  },
  subscribe (listener) {

  },
  addModule() {

  },
  removeModule() {

  },
  replaceState(newState) {

  },
  getState () {

  },
  hotUpdate() {

  }
}

const userModule = {
  user: {
    name: 'tingyuan',
    age: 13
  },
  changeUser (userInfo) {
    this.user = {
      ...this.user,
      ...userInfo
    }
  },
  Todo: {
    list: [{text: 'first item', id: 1, done: true}],
    get done() {
      return this.list.filter(v => v.done).length
    },
    add(text) {
      this.list.push({
        text, id: Math.random(), done: false
      })
    },
    remove(id) {
      const index = this.list.findIndex(v => v.id === id)
      if (index > -1) {
        this.list.splice(index, 1)
      }
    }
  }
}

const userModule2 = {
  user: {
    name: 'tingyuan',
    age: 13
  },
  changeUser (userInfo) {
    this.user = {
      ...this.user,
      ...userInfo
    }
  },
  Todo: {
    list: [{text: 'first item', id: 1, done: true}],
    get done() {
      return this.list.filter(v => v.done).length
    },
    add(text) {
      this.list.push({
        text, id: Math.random(), done: false
      })
    },
    remove(id) {
      const index = this.list.findIndex(v => v.id === id)
      if (index > -1) {
        this.list.splice(index, 1)
      }
    }
  }
}

function createStore (userModule: object) {
  const store = Vue.observable(Object.assign(Object.create(base), userModule))
  return store
}

export default {
  install (vue: typeof VueType): void {
    Vue = vue
  },
  createStore
}
