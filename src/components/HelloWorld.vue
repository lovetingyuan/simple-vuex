<template>

  <div class="todo-list">
    <my-comp></my-comp>
    <h1>{{ $Store.title }}</h1>
    <div>
      <input v-model.trim="newItem" placeholder="please enter">&nbsp;&nbsp;
      <button @click="onAdd">add</button>&nbsp;
      <button @click="onAddImportant">add as important</button>
    </div>
    <h3>Most important item 🌟: {{ todoModule.Important.event || 'None' }}</h3>
    <p v-if="loading">loading...</p>
    <ol v-if="todoModule.list.length">
      <li v-for="item in todoModule.list" :key="item.id">
        {{item.content}}<a href="javascript:" @click="onRemove(item)">&nbsp;&nbsp;❌</a>
      </li>
    </ol>
    <em v-else>nothing here</em>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'
import store from '@/store'

import MyComp from './MyComp.vue'

type Item = typeof store.Todo.list[0]
type DynamicType = typeof store.Todo.Dynamic & {}

store.addModule('Todo.Dynamic', {
  aa: 'assa657',
  setaa (p) {
    console.log(22, this)
    this.aa = p
  }
} as DynamicType)

@Component({
  components: { MyComp }
})
export default class HelloWorld extends Vue {
  private newItem = ''
  private loading = false
  private todoModule = store.Todo
  private dynamicModule = store.Todo.Dynamic as DynamicType
  private onAdd () {
    this.newItem && this.todoModule.setItem({
      id: Math.random(),
      content: this.newItem
    })
    this.newItem = ''
  }
  private onRemove (item: Item) {
    if (confirm('are you sure to delete ' + item.content)) {
      this.todoModule.deleteItem(item.id)
    }
  }
  private onAddImportant () {
    this.newItem && this.todoModule.Important.setContent(this.newItem)
    this.newItem = ''
  }
  private mounted () {
    this.loading = true
    this.todoModule.$fetchItems().finally(() => {
      this.loading = false
      setTimeout(() => {
        this.dynamicModule.setaa('newadddd')
      }, 100)
    })
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
a {
  text-decoration: none;
}
li {
  margin: 18px 0;
}
input {
  height: 16px;
  padding: 5px 8px;
}
button {
  padding: 6px 20px;
  cursor: pointer;
}
</style>
