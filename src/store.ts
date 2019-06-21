type Item = {id: number, content: string}

interface Modules {
  user: {
    name: string
  }
  title: string
  Todo: {
    list: Item[]
    count: number
    setItem: (p: Item | Item[]) => void
    deleteItem: (p: number) => void
    $fetchItems: () => Promise<any>
    Important: {
      event: string
      setContent: (e: string) => void
    },
    Dynamic?: {
      aa: string,
      setaa: (a: string) => void
    }
  },
}


const modules: Modules = {
  user: {
    name: 'tingyuan',
  },
  get title () {
    return `todo list(${this.Todo.count})`
  },
  Todo: {
    list: [],
    get count() {
      return this.list.length
    },
    setItem(item) {
      if (Array.isArray(item)) {
        this.list = item
      } else {
        this.list.push(item)
      }
    },
    deleteItem(id) {
      this.list = this.list.filter(v => v.id !== id)
    },
    async $fetchItems() {
      await new Promise(r => setTimeout(r, 2000))
      this.setItem([
        {id: 1, content: 'item 1'},
        {id: 2, content: 'item 2'}
      ])
    },
    Important: {
      event: '',
      setContent(event) {
        this.event = event
      }
    },
  },
}

import { createVuexStore } from './myStore'

const store = createVuexStore(modules, {
  strict: true
})

console.log("$", store)

export default store

declare module "vue/types/vue" {
  interface Vue {
    $Store: typeof store
  }
}
