type Item = {
  text: string,
  done: boolean,
  id: number
}

export default {
  list: [] as Item[],
  get doneCount() {
    return this.list.filter(v => v.done).length
  },
  setList(list: Item[]) {
    this.list = list
  },
  add(text: string) {
    this.list.push({
      text, id: Math.random(), done: false
    })
  },
  remove(id: number) {
    this.list = this.list.filter(v => v.id !== id)
  },
  markDone(id: number) {
    const item = this.list.find(v => v.id === id)
    if (item) {
      item.done = !item.done
    }
  },
  $fetchList() {
    return new Promise((resolve) => {
      setTimeout(() => {
        const gen = (id: number) => ({ text: `async item ${id}`, id, done: Math.random() > 0.5 })
        const list = []
        for(let i = 0; i < 10; i++) {
          list.push(gen(i + 1))
        }
        this.setList(list)
        resolve()
      }, 1500)
    })
  }
}
