<template>
  <div class="counter">
    <h1>number counter</h1>
    <input type="number" v-model.number="count">
    <button @click="onAddOne">add one</button>
    <button @click="onDouble">double</button>
    <button @click="onRandom">async random</button>

  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import store from '../store'

export default Vue.extend({
  computed: {
    count: {
      get () {
        return store.Counter.count
      },
      set (value) {
        store.Counter.reset(value as number)
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
      store.Counter.$asyncNumber()
    }
  }
})
</script>
