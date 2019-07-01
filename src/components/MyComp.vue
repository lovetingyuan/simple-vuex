<template>
  <div>
    {{store.user.name}} {{store.Todo.count}}
     <!-- {{store.Todo.Test.test}} -->
    <ol>
      <li v-for="item in store.Todo.list" :key="item">{{item}}</li>
    </ol>
    <button @click="onAdd">add</button>
    <button @click="changeName">name</button>
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
  private changeName () {
    store.setName('' + Date.now())
  }
  private created () {
    store.Todo.$fetchList()
    store.setName()
    const Test = store.addModule('Todo.Test', {
      test: 'testtest',
      updateTest (a: string) {
        console.log('Test', this)
        this.test = a
      },
      get tt () {
        console.log('tt', this)
        return this.test
      },
      Bar: {
        bb: 'bbbb',
        get nn () {
          return this.bb
        }
      }
    })
    Test.updateTest('newtest')
    store.replaceState({
      user: {
        name: 'newnsdfsdf',
        age: 324
      },
      Todo: {
        list: ['34fsd']
      }
    })
    // store.watch(function () {
    //   return this
    // }, function (newV, old) {
    //   console.log(234234, old, newV)
    // }, {
    //   deep: true
    // })
    // store.user = {
    //   name: 'sdfsdf'
    // }
    // store.user.name = 'sdfhjskfdshjkf'
    // store.removeModule('Todo.Test')
  }
}
</script>
