/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 */
// Observer 类是一个附加到每个被观察对象的观察者类。一旦附加后，这个观察者
// 将目标对象的属性转换成 getter/setter，用于收集依赖关系并派发更新（发送通知）
export class Observer {
  // 把属性定义在 class 的最上面是 ES6 的语法，申请属性的类型是 flow 的语法
  // flow 是 ES 的超级，也就是 flow 包含 ES语法
  // 把属性定义在最上面的好处是：看上去清晰

  value: any;      // 被观察对象
  dep: Dep;        // 依赖对象
  vmCount: number; // 实例计数器 number of vms that have this object as root $data

  constructor (value: any) {
    // 被观察对象
    this.value = value
    // 依赖收集
    this.dep = new Dep()
    // 初始化实例的 vmCount 为 0
    this.vmCount = 0
    // 将实例挂载到观察对象的 __ob__ 属性
    // def 这个方法就是对 Object.defineProperty 做了封装，__ob__ 这个属性设置了不可枚举，
    // 好处是：将来要给 value 对象的属性设置 getter/setter 的，而 __ob__ 只是用来记录
    // observer 对象的，所以不用设置 getter/setter
    def(value, '__ob__', this)
    if (Array.isArray(value)) {
      // 对数组做响应式处理
      if (hasProto) {
        protoAugment(value, arrayMethods)
      } else {
        copyAugment(value, arrayMethods, arrayKeys)
      }
      // 为数组中的每一个对象创建一个 observer 实例
      this.observeArray(value)
    } else {
      // value 是对象
      // 遍历对象中的每一个可枚举属性，转换成 getter/setter
      this.walk(value)
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk (obj: Object) {
    // 获取观察对象的每一个属性
    const keys = Object.keys(obj)
    // 遍历每一个属性，设置为响应式数据
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  // 如果 value 不是对象 或者是 VNode 实例 - 就return，表示不需要做响应式处理
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  // 如果 value 有 __ob__ (observer对象) 属性就直接返回
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if ( // 判断 value 对象是否可以做响应式处理
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue // 判断 value 对象是否是 Vue 实例，如果是 Vue 实例就不需要做响应式处理
  ) {
    ob = new Observer(value) // 最核心：创建了 observer 对象
  }
  if (asRootData && ob) {
    // vmCount +1
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 */
// 为一个对象定义一个响应式的属性
export function defineReactive (
  obj: Object, // 目标对象
  key: string, // 要转换目标对象上的哪个属性
  val: any,    // 值
  customSetter?: ?Function,
  shallow?: boolean // true 的话只监听 obj 的第一层属性，否则就是深度监听
) {
  // 创建依赖对象实例 - 负责为当前对象的属性来收集依赖，也就是收集 观察当前这个属性的所有 watcher
  const dep = new Dep()
  // 获取 obj 的属性描述符对象
  // 在通过 Object.defineProperty 定义属性的时候，第3个参数就是属性描述符
  // configurable 指定当前属性是否是可配置的，若为 false 就是意味着不可能通过 delete 删除，
  // 还不可以通过 Object.defineProperty 重新定义
  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  // 如果预定义有 get set 则先取出来，后面再在 Object.defineProperty 重写 get set
  const getter = property && property.get
  const setter = property && property.set
  // 如果没有 getter 或者只有 setter 并且传入的参数只有2个(obj 和 key) 则设置 val
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }
  // shallow 为 false 表示深度监听（多层监听）- 递归处理
  // 如果 val 也是对象，则需要将子对象属性都转换成 getter/setter，返回 子观察对象ob
  let childOb = !shallow && observe(val)
  // 将属性转换成 getter/setter
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      // 如果用户设置了 getter 则调用它，从而获取旧值，否则用当前 val
      const value = getter ? getter.call(obj) : val
      // 收集依赖
      if (Dep.target) {
        dep.depend()
        if (childOb) {
          childOb.dep.depend()
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      // 返回属性的值
      return value
    },
    set: function reactiveSetter (newVal) {
      // 如果用户设置(预定义)了 getter 则调用它，从而获取旧值，否则用 val 充当旧值
      const value = getter ? getter.call(obj) : val

      // 如果新值等于旧值或者新值旧值为 NaN 则不执行（不需要发送通知）
      // newVal !== newVal 代表 newVal 是 NaN，因为 NaN 不等于自身
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }

      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }

      // 如果 getter 存在 setter 不存在 则直接返回，表示属性是只读的
      // #7981: for accessor properties without setter
      if (getter && !setter) return

      // 如果预定义 setter 存在则调用 setter
      if (setter) {
        setter.call(obj, newVal)
      } else {
        // getter/setter 都不存在，直接把新值赋给旧值
        val = newVal
      }

      // 如果新值是对象，再把这个子对象的属性转换成 getter/setter 并返回 observer 对象
      childOb = !shallow && observe(newVal)

      // 派发更新（通知所有观察者）
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
