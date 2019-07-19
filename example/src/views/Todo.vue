<template>
  <div class="todo">
    <h1>todo list</h1>
    <input type="text" placeholder="enter whatever" v-model.trim="event" @keyup.enter="onAdd">
    <button @click="onAdd">add ({{doneCount}}/{{allCount}})</button>
    <span>
      <a href="javascript:void(0)" :class="{active: filter === 'all'}" @click="onFilter('all')">all</a> |
      <a href="javascript:void(0)" :class="{active: filter === 'done'}" @click="onFilter('done')">done</a> |
      <a href="javascript:void(0)" :class="{active: filter === 'undone'}" @click="onFilter('undone')">undo</a>
    </span>
    <div style="padding: 50px;">
      <ol v-if="list.length" class="list">
        <li v-for="item in list" :key="item.id" class="item">
          <span @click="onSwitch(item)"
            v-if="editId !== item.id"
            :class="{done: item.done}">
            {{item.text}}
          </span>
          <input type="text" autofocus v-else @change="onEdit" :value="item.text">
          &nbsp;
          <i @click="onDelete(item)">✗</i>&nbsp;
          <i @click="editId = editId ? 0 : item.id" v-if="!item.done">✒️</i>
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
import todoModule from '../modules/todoListModule'

const todoStore = store.Todo || store.addModule('Todo', todoModule)

type Item = typeof todoModule.list[0]

type Status = Parameters<typeof todoModule.setStatus>[0]

export default Vue.extend({
  data() {
    return {
      event: '',
      editId: 0
    }
  },
  computed: {
    filter() {
      return store.Todo.status
    },
    list() {
      return todoStore.displayList
    },
    doneCount() {
      return todoStore.doneCount
    },
    allCount() {
      return todoStore.allCount
    }
  },
  methods: {
    onAdd() {
      if (this.event) {
        todoStore.add(this.event)
        this.event = ''
      }
    },
    onDelete(item: Item) {
      if (!item.done) {
        if (confirm(`Are you sure to delete: ${item.text} ?`)) {
          todoStore.remove(item.id)
        }
      } else {
        todoStore.remove(item.id)
      }
    },
    onSwitch(item: Item) {
      todoStore.markDone(item.id)
    },
    onFilter(type: Status) {
      todoStore.setStatus(type)
    },
    onEdit(evt: Event) {
      const newText = (evt.target as HTMLInputElement).value.trim()
      if (newText) {
        todoStore.edit({
          id: this.editId,
          text: newText
        })
      }
      this.editId = 0
    }
  },
  created() {
    if (!todoStore.list.length) {
      todoStore.$fetchList()
    }
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
.active {
  color: yellowgreen;
}
i {
  cursor: pointer;
}
</style>
