/* @flow */

import { toArray } from '../util/index'

export function initUse (Vue: GlobalAPI) {
  console.log('initUse() - 注册 Vue.use() 用来注册插件')

  // 给 Vue 增加了一个 use 的静态方法
  Vue.use = function (plugin: Function | Object) {
    // 此处的 this 是谁？我们调用的是 Vue.use() 那么 use 就是 Vue 构造函数调用的
    // this 就是 Vue 构造函数
    // _installedPlugins：记录所有安装的插件
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    // 当前要注册的插件是否已存在
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }

    // additional parameters
    // 因为 Vue.use() 在调用的时候可以传多个参数，如果是多个参数的话
    // 那把arguments数组中的第一个元素(plugin)去除，就能得到其它参数了(args)
    const args = toArray(arguments, 1)
    // 把 this(Vue) 插入到第一个元素的位置，使得 args 数组中的第一个元素是 Vue 构造函数
    // 因为 install() 函数的第一个参数要求是 Vue
    args.unshift(this)
    // plugin 是个对象的话，就必须有个 install 方法
    if (typeof plugin.install === 'function') {
      // 改变 install 中的 this 指向
      plugin.install.apply(plugin, args)
    } else if (typeof plugin === 'function') {
      plugin.apply(null, args)
    }
    // 把注册好的插件存储到 _installedPlugins 数组中
    installedPlugins.push(plugin)
    return this
  }
}
