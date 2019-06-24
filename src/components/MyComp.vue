<template>
  <div>
    {{store.user.name}} {{store.Todo.count}}
     <!-- {{store.Todo.Test.test}} -->
    <ol>
      <li v-for="item in store.Todo.list" :key="item">{{item}}</li>
    </ol>
    <button @click="onAdd">add</button>
  </div>
</template>
<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'
import store from './store'
store.subscribe(function () {
  console.log(arguments)
})
console.log('store', store)

@Component
export default class HelloWorld extends Vue {
  private store = store
  private onAdd () {
    store.Todo.addItem(Date.now() + '')
  }
  private created () {
    store.Todo.$fetchList()
    const Test = store.addModule('Todo.Test', {
      test: 'testtest',
      updateTest (a: string) {
        this.test = a
      }
    })
    Test.updateTest('newtest')
    // store.removeModule('Todo.Test')
  }
}
</script>
