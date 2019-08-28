type Item = {
  text: string,
  done: boolean,
  id: number
}

enum Status {
  ALL = 'all',
  DONE = 'done',
  UNDONE = 'undone'
}

const todoModule = {
  list: [] as Item[],
  status: 'all' as Status,
  get displayList () {
    if (this.status === Status.ALL) {
      return this.list
    }
    return this.list.filter(v => this.status === Status.DONE ? v.done : !v.done)
  },
  get allCount () {
    console.log(9898)
    return this.list.length
  },
  get doneCount () {
    console.log('get yui6768790 asdasd')
    return this.list.filter(v => v.done).length
  },
  setList (list: Item[]) {
    this.list = list
  },
  setStatus (type: Status) {
    this.status = type
  },
  add (text: string) {
    this.list.push({
      text, id: Math.random(), done: false
    })
  },
  get dd () {
    return this.list.join(',')
  },
  remove (id: number) {
    this.list = this.list.filter(v => v.id !== id)
  },
  markDone (id: number) {
    console.log(id + ' mark kjkjkj ', this)
    const item = this.list.find(v => v.id === id)
    if (item) {
      item.done = !item.done
    }
  },
  edit ({ id, text }: {id: number, text: string}) {
    const item = this.list.find(v => v.id === id)
    if (item) {
      item.text = text
    }
  },
  $fetchList () {
    console.log('sdfs9fs')
    return new Promise((resolve) => {
      setTimeout(() => {
        const gen = (id: number) => ({ text: `async item ${id}`, id, done: Math.random() > 0.5 })
        const list = []
        for (let i = 0; i < 10; i++) {
          list.push(gen(i + 1))
        }
        this.setList(list)
        resolve()
      }, 1500)
    })
  }
}
export default todoModule
export type TodoModuleType = typeof todoModule
