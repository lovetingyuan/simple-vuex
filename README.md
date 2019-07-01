# simple-vuex
*still developing...*

a simpler way to use redux-like state management in vue project

* simpler way to write your mutations, getters, actions, no ACTION_TYPE, commit, dispatch
* better and natural support for typescript

### example
`store.ts`
```typescript
type Item = { text: string, done: boolean }

const modules = {
  user: {
    name: 'nobody'
  },
  setUserName(username: string) {
    this.user.name = username
  },
  Todo: {
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
}

const store = createStore(modules)

store.Todo.doneCount // equals to `store.getters['Todo/doneCount']`
store.Todo.addItem('new item') // equals to `store.commit('Todo/addItem', 'new item')`
store.Todo.$fetchList() // equals to `store.dispatch('Todo/$fetchList')`

export default store
```

### api
* `store = createStore(modules)`
* `store.watch(fn, cb)`
* `store.subscribe(listener)`
* `store.addModule(modulePath, module)`
* `store.removeModule(modulePath)`
* `store.replaceState(newState)`

### convention
1. name of sub-module(namespace) starts with **capital letter**
2. name of action method(with side-effect) starts with **'$'**
3. getter property will be taken as 'getters'
