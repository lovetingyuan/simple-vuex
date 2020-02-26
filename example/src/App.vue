<template>
  <div id="app">
    <div id="nav">
      <router-link to="/">Home</router-link> |
      <router-link to="/counter">Counter</router-link> |
      <router-link to="/todo-list">Todo-List</router-link>
    </div>
    <router-view/>
  </div>
</template>

<script>
export default {
  
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
#nav {
  padding: 30px;
}

#nav a {
  font-weight: bold;
  color: #2c3e50;
}

#nav a.router-link-exact-active {
  color: #42b983;
}
h1 {
  text-transform: capitalize;
}
input {
  padding: 8px 10px;
  margin: 0 20px;
}
button {
  padding: 8px 20px;
  margin: 0 10px;
}
</style>
