import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

// 创建 Vue 的构造函数
// 此处不用 class 的原因是：方便后续给 Vue 实例混入实例成员
function Vue (options) {
  console.log('Vue 构造函数 - 被调用 - 接着即将调用实例的 _init() 方法 ...')
  // 判断 this 是否是 Vue 的实例，如果不是则说明没有用 new 来调用 Vue()
  // 也就是说把 Vue 当作是一个普通函数，此时会发出警告
  if (process.env.NODE_ENV !== 'production' && !(this instanceof Vue) ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  // 调用实例的 _init() 方法 - 首次渲染
  this._init(options)
}

// 设置 Vue 的实例成员
initMixin(Vue)       // 注册 _init 实例方法，调用是在Vue构造函数中调用
stateMixin(Vue)      // 注册 $data / $props / $set / $delete / $watch 实例成员
eventsMixin(Vue)     // 注册事件相关的 $on / $once / $off / $emit 实例方法
lifecycleMixin(Vue)  // 注册 _update / $forceUpdate / $destroy 实例方法
renderMixin(Vue)     // 注册 $nextTick / _render 实例方法

export default Vue
