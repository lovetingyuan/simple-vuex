<template>
  <div class="counter">
    <h1>number counter</h1>
    <input type="number" v-model.number="count">
    <button @click="onAddOne">add one</button>
    <button @dblclick="onDouble">double click</button>
    <button @click="onRandom" :disabled="loading">async random</button>

  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import store from '../store'

export default Vue.extend({
  data() {
    return {
      loading: false
    }
  },
  computed: {
    count: {
      get () {
        return store.Counter.count
      },
      set (value: number) {
        store.Counter.reset(value)
      }
    }
  },
  methods: {
    onAddOne() {
      store.Counter.add(1)
    },
    onDouble() {
      store.Counter.double()
    },
    onRandom() {
      this.loading = true
      store.Counter.$asyncNumber().finally(() => {
        this.loading = false
      })
    }
  }
})
</script>
