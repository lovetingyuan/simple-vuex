const modules = {
  user: {
    name: 'tingyuan'
  },
  Todo: {
    list: [] as string[],
    get count() {
      return this.list.length
    },
    setList(list: string[]) {
      this.list = list
    },
    addItem(t: string) {
      this.list.push(t)
    },
    $test() {

    },
    $fetchList() {
      setTimeout(() => {
        this.setList(['111', '2222'])
      }, 2000);
    }
  }
}

import { createVueStore } from '../myStore'

export default createVueStore(modules)
