/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from '../util/index'

const arrayProto = Array.prototype
// 创建一个新的空对象，这个对象的原型对象指向 数组的原型对象
export const arrayMethods = Object.create(arrayProto)

// 修改数组元素的方法
// 当数组中的内容发生变化的时候就要通过dep.notify发送通知，通知watcher更新视图
// 但是数组原生的方法是不知道dep的存在
const methodsToPatch = [
  'push',    // 新增元素
  'pop',
  'shift',
  'unshift', // 从数组开头新增元素，并返回该数组的新长度
  'splice',  // 可能新增元素
  'sort',    // 排序，数组中位置发生变化
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 */
methodsToPatch.forEach(function (method) {
  // cache original method
  // 缓存原始的数组方法
  const original = arrayProto[method]
  // 调用 Object.defineProperty 重新定义修改数组的方法，给 arrayMethods 这个对象重新去注册 方法
  // def 的第三个参数就是第二个参数方法名 对应的方法
  // ...args 就是在调用如：push, pop 的时候传入的参数
  def(arrayMethods, method, function mutator (...args) {
    // 先执行数组的原始方法 - 方法从原型上拿
    const result = original.apply(this, args)
    // 获取数组所关联的 observer 对象
    const ob = this.__ob__
    let inserted // 存储数组中新增的元素
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2) // splice 方法的第三个参数就是 新增的值
        break
    }
    // 对插入的新元素，重新遍历数组元素设置为响应式数据
    if (inserted) ob.observeArray(inserted)
    // notify change
    // 调用了修改数组的方法，调用数组的 ob 对象发送通知
    ob.dep.notify()
    return result
  })
})
