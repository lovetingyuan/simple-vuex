<template>
  <div class="todo">
    <h1>todo list</h1>
    <input type="text" placeholder="enter whatever" v-model.trim="event" @keyup.enter="onAdd">
    <button @click="onAdd">add ({{doneCount}}/{{list.length}})</button>
    <div style="padding: 50px;">
      <ol v-if="list.length" class="list">
        <li v-for="item in list" :key="item.id" class="item">
          <span @click="onSwitch(item)"
            :class="{done: item.done}">
            {{item.text}}
          </span>&nbsp;
          <i @click="onDelete(item)">✗</i>
        </li>
      </ol>
      <div v-else>
        empty list, please add
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import store from '../store'

type Item = typeof store.Todo.list[0]

export default Vue.extend({
  data() {
    return {
      event: ''
    }
  },
  computed: {
    list() {
      return store.Todo.list
    },
    doneCount() {
      return store.Todo.doneCount
    }
  },
  methods: {
    onAdd() {
      if (this.event) {
        store.Todo.add(this.event)
        this.event = ''
      }
    },
    onDelete(item: Item) {
      if (!item.done) {
        if (confirm(`Are you sure to delete: ${item.text} ?`)) {
          store.Todo.remove(item.id)
        }
      } else {
        store.Todo.remove(item.id)
      }
    },
    onSwitch(item: Item) {
      store.Todo.markDone(item.id)
    }
  },
  created() {
    store.Todo.$fetchList()
  }
})
</script>

<style scoped>
.list {
  width: 50%;
  margin: 0 auto;
  text-align: left;
  list-style-position: inside;
}
.item {
  padding: 10px;
}
.done {
  text-decoration: line-through;
  font-style: italic;
}
</style>
