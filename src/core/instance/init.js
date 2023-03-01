/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  console.log('在 src/core/instance/index.js 里调用 initMixin(Vue) - 注册 _init 实例方法，调用是在Vue构造函数中调用')
  // 定义 _init() 实例方法
  Vue.prototype._init = function (options?: Object) {
   console.log('_init() - 挂载 _uid / _isVue / $options 成员 - 合并用户传入的options 和 Vue的静态成员options(Vue.options)')

    const vm: Component = this
    // a uid
    vm._uid = uid++

    // 开发环境下的性能检测
    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    // 将 vm 标识为 Vue 实例，目的是：将来在设置响应式数据的时候不对它处理
    vm._isVue = true

    // merge options
    // 合并 用户传入的options 和 Vue.options
    if (options && options._isComponent) { // 判断当前 vm 是不是组件
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options) // 如果是组件则通过 initInternalComponent 合并 options 选项
    } else {
      // 当前是 Vue实例，不是组件
      vm.$options = mergeOptions(
        // vm.constructor 指向 Vue
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    console.log('Vue.options = ', vm.constructor.options)
    console.log('vm = ', vm)

    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      // 渲染时候的代理对象
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm

    // 初始化和 vm 生命周期相关的成员 $parent / $root / $children / $refs 还有一些 _私有成员
    initLifecycle(vm)

    // 初始化和 vm 事件相关的成员：_events，当调用 vm.$on('', () => {}) 会将事件存入 vm._events 对象中
    initEvents(vm)

    // render 中的 h 函数被初始化了，并且还初始化了几个属性：
    // $slots / $scopedSlots / _c / $createElement / $attrs / $listeners 其中 $createElement 就是 h 函数（把虚拟DOM 转换成真实DOM）
    initRender(vm)

    // 触发 生命周期钩子函数 beforeCreate
    callHook(vm, 'beforeCreate')

    // 把 vm.$options 中的 inject 成员注入到 vm 实例上并设置成响应式数据（inject 中的成员需要在 vm._provided 中存在的属性
    initInjections(vm) // resolve injections before data/props

    // 初始化 vm 的 _props / methods / _data / computed / watch --- 用户Watcher 和 Computed Watcher
    initState(vm)

    //  初始化 vm._provided，找到 vm.$options.provide 对象，并将其处理后赋值给 vm._provided 后面在依赖注入的操作时要用到
    initProvide(vm) // resolve provide after data/props

    // 触发 生命周期钩子函数 created
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    // 调用 $mount() 挂载整个页面
    // 如果没有在选项里传el，那么就在实例创建好后自动调用：new Vue().$mount('#app') 也是一样的
    if (vm.$options.el) {
      vm.$mount(vm.$options.el) // 渲染watcher 是在这里以后的 mountComponent 函数里初始化的
    }
  }
}

export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
