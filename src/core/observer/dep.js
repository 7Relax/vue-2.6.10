/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */
export default class Dep {
  static target: ?Watcher; // 静态属性，watcher 对象
  id: number;              // dep 实例 id
  subs: Array<Watcher>;    // dep 实例对应的 watcher 对象/订阅者数组

  constructor () {
    this.id = uid++
    this.subs = []
  }

  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  // 将观察对象和 watcher 建立依赖
  depend () {
    if (Dep.target) {
      // 调用了 watcher 的 addDep 方法
      Dep.target.addDep(this)
    }
  }

  notify () {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort((a, b) => a.id - b.id)
    }
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// Dep.target 用来存放目前正在使用的 watcher
// 全局唯一，并且一次也只能有一个 watcher 被使用 - 同一时间只有一个 watcher 被使用
// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
Dep.target = null
const targetStack = []

// 入栈并将当前 watcher 赋值给 Dep.target
export function pushTarget (target: ?Watcher) {
  // 在 Vue 2 以后，每个组件都有一个对应的 watcher 对象（用于渲染视图的）：
  // 每个组件都有一个 mountComponent，我们在 mountComponent 函数中创建了 watcher 对象
  // 所以每个组件都对应一个 watcher 对象。
  // 如果组件有嵌套的话，如 A 组件嵌套了 B 组件，当渲染 A 组件的过程中发现还有子组件B，于是要先去渲染子组件
  // 此时 A 组件的渲染过程就被挂载起来了，所以 A 组件对应的 watcher 对象也应该被存储起来(targetStack中)
  // 当子组件B 渲染完毕后，会把 A 组件的 watcher 从栈中弹出 popTarget() 继续去执行父组件的渲染
  targetStack.push(target)
  Dep.target = target
}

export function popTarget () {
  // 出栈操作
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
