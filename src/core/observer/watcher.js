/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  noop
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function;
  getter: Function;
  value: any;

  // 在Vue中有3种Watcher：1.渲染watcher 2.计算属性的watcher 3.侦听器的watcher
  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean // 是否为 渲染watcher
  ) {
    // 把 Vue实例 记录到当前 watcher 对象的vm上
    this.vm = vm
    // 是否是渲染Watcher
    if (isRenderWatcher) {
      // 是渲染watcher 就把当前watcher 记录到当前Vue实例的_watcher上
      vm._watcher = this
    }
    // 把当前的 watcher 对象存储到 Vue实例的 _watchers 数组中
    vm._watchers.push(this) // 我们创建的 计算属性 侦听器 也会创建对应的 watcher
    // options
    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user
      // lazy: 是否延迟更新视图，如果是首次渲染的话，就要立即更新。
      // 如果是计算属性的watcher的话它就会延迟执行，只有当数据变化的时候才会去更新视图
      this.lazy = !!options.lazy
      this.sync = !!options.sync
      this.before = options.before // 这里会触发生命周期钩子函数 beforeUpdate
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb // 用户wathcer（侦听器），会传入一个回调对比新旧两个值
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.lazy // for lazy watchers
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    // expOrFn 是渲染watcher 传过来的第二个参数 updateComponent()
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      // expOrFn 是字符串的时候，就相当于拿到了'person.name' 例如：watch: { 'person.name': function() {} }
      // parsePath：生成一个函数，作用是用来获取 'person.name' 的值，这样就会触发这个属性的 getter
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = noop
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    this.value = this.lazy // 渲染watcher时候是false，计算属性的话就是true延迟执行
      ? undefined
      : this.get()
  }
  /**
   * Evaluate the getter, and re-collect dependencies.
   */
  get () {
    // pushTarget(this) 作用：把当前的 watcher 对象保存起来：
    // 每个组件都会对应一个 watcher, watcher 就会去渲染视图，如果组件有嵌套的话，
    // 它会先渲染内部的组件，所以它要把父组件对应的 watcher 先保存起来
    pushTarget(this)

    let value
    const vm = this.vm // 从watcher中拿到 Vue实例
    try {
      // 调用传入的 expOrFn，并且改变函数内部this的指向(Vue实例)
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) { // 深度监听
        traverse(value)
      }
      // 使当前wathcer 从targetStack出栈
      popTarget()
      // 把当前watcher 从dep.subs数组中移除，
      // 并且也会把watcher中记录的dep也给移除，因为整个watcher已经执行完毕
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   */
  // 收集依赖
  addDep (dep: Dep) {
    const id = dep.id
    // newDepIds 一个 Set 对象
    // 判断有没有存储过这个 dep id
    if (!this.newDepIds.has(id)) {
      // newDepIds newDeps 是 wathcer 对象的属性
      this.newDepIds.add(id)
      this.newDeps.push(dep) // watcher 中为何要添加 dep ?
      if (!this.depIds.has(id)) {
        // 重点：将 watcher 对象添加到 dep 对象的 subs 数组中
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  update () {
    /* istanbul ignore else */
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      this.run()
    } else {
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  run () {
    if (this.active) {
      const value = this.get()
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value
        this.value = value
        if (this.user) {
          try {
            this.cb.call(this.vm, value, oldValue)
          } catch (e) {
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
