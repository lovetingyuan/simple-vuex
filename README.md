# vue-store
*still developing...*

[![npm version](https://img.shields.io/npm/v/@tingyuan/vue-store.svg)](https://www.npmjs.com/package/@tingyuan/vue-store)

a simpler way to use redux-like state management in vue project

* Simpler way to share and change your application state, NO ACTION_TYPE, commit, dispatch, helpers...
* Better and natural support for typescript
* Only 1.5KB after gzip but with adequate support

### install
```bash
npm install @tingyuan/vue-store
```

### example
`store.ts`
```typescript
type Item = { text: string, done: boolean }

const todoModule = {
  list: [] as Item[],
  get doneCount() {
    return this.list.filter(v => v.done).length
  },
  setList(list: Item[]) {
    this.list = list
  },
  addItem(text: string) {
    this.list.push({
      text, done: false
    })
  },
  async $fetchList() {
    const list = await request('/api/get-list')
    this.setList(list)
  }
}

const modules = {
  user: {
    name: 'nobody'
  },
  setUserName(username: string) {
    this.user.name = username
  },
  Todo: todoModule
}

import Vue from 'vue'
import VueStore from '@tingyuan/vue-store'

Vue.use(VueStore)

const store = VueStore.createStore(modules, {
  strict: true,
  plugins: [
    store => {
      store.subscribe(({ type, actionType, payload }, state) => {
        if (type) {
          console.log('mutation called: ' + type)
        } else {
          console.log('action called: ' + actionType)
        }
      })
    }
  ]
})

export default store
```

```html
<template>
  <div>
    <h1>Hello {{$store.user.name}}, Todo List({{counter}})</h1>
    <input type="text" placeholder="enter whatever" v-model.trim="newItem" @keyup.enter="onAdd">
    <ol>
      <li v-for="item in todoList" :key="item.id" :class="item.done ? 'done' : ''">{{item.text}}</li>
    </ol>
  </div>
</template>
<script>
export default {
  data() {
    return { newItem: '' }
  },
  computed: {
    todoList() { return this.$store.Todo.list },
    counter() { return this.$store.Todo.doneCount + '/' + this.todoList.length }
  },
  methods: {
    onAdd() {
      this.newItem && this.$store.Todo.addItem(this.newItem)
    }
  },
  created() {
    this.$store.Todo.$fetchList()
  }
}
</script>
<style>
.done { text-decoration: line-through; }
</style>
```

### declare `store` option

```typescript
import store from './store'
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
```

### api
* `store = VueStore.createStore(modules, options)`
* `store.watch(getter, callback)`
* `store.subscribe(listener)`
* `store.addModule(modulePath, module, options)`
* `store.removeModule(modulePath)`
* `store.replaceState(newState)`
* `store.getState()`
* `store.hotUpdate(path, module)`

### convention(compulsory in fact)
1. name of sub-module(namespace) starts with **capital letter**
2. name of action method(with side-effect) starts with **'$'**
3. getter property will be taken as 'getters'
