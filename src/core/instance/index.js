import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

// 创建 Vue 的构造函数
// 此处不用 class 的原因是：方便后续给 Vue 实例混入实例成员
function Vue (options) {
  console.log('Vue 构造函数 - 被调用 ...')
  // 判断 this 是否是 Vue 的实例，如果不是则说明没有用 new 来调用 Vue()
  // 也就是说把 Vue 当作是一个普通函数，此时会发出警告
  if (process.env.NODE_ENV !== 'production' && !(this instanceof Vue) ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  // 调用实例的 _init() 方法
  this._init(options)
}

// 设置 Vue 实例的成员
initMixin(Vue)       // 注册 vm 的 _init() 方法，初始化 vm
stateMixin(Vue)      // 注册 vm 的 $data/$props/$set/$delete/$watch （继续混入一些成员）
eventsMixin(Vue)     // 初始化事件相关方法 $on/$once/$off/$emit
lifecycleMixin(Vue)  // 初始化生命周期相关的混入方法 _update/$forceUpdate/$destroy
renderMixin(Vue)     // vm 上 混入 _render/$nextTick

export default Vue
