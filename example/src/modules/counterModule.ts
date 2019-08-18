export default {
  count: 0,
  add(num: number) {
    this.count = this.count + num
  },
  double() {
    this.count = this.count * 2
  },
  reset(newVal: number) {
    this.count = newVal || 0
  },
  $asyncNumber() {
    // mock async action
    return new Promise((resolve) => {
      setTimeout(() => {
        const random = parseInt(Math.random() * 200 + '')
        this.reset(random)
        resolve()
      }, 1500)
    })
  }
}
