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
  console.log('initMixin() - 被调用 ...')
  // Vue 实例方法 _init 是在这里定义的
  // 合并 options / 初始化操作
  Vue.prototype._init = function (options?: Object) {
   console.log('Vue 实例的 _init() 方法 - 被调用 ...')

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
    // 合并 options
    // 将用户传入的 options 和初始化时构造函数中的 options 合并起来
    console.log('初始化时用户传入 Vue 构造函数的 options = ', options)
    console.log('Vue 构造函数的 options: vm.constructor.options = ', vm.constructor.options)
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)
    } else {
      vm.$options = mergeOptions(
        // vm.constructor 指向 Vue
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
      console.log('合并后的 options: vm.$options = ', vm.$options)
    }
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

    // 初始化和 vm 生命周期相关的变量
    initLifecycle(vm)

    // 初始化和 vm 相关的事件
    initEvents(vm)

    // 初始化 render 函数中的 h 函数，并且还初始化了几个属性
    // $slots / $scopedSlots / _c / $createElement / $attrs / $listeners
    initRender(vm)

    // 触发 生命周期钩子函数 beforeCreate
    callHook(vm, 'beforeCreate')

    // 把 inject 的成员注入到 vm 上
    initInjections(vm) // resolve injections before data/props

    // 初始化 vm 的 _props / methods / _data / computed / watch
    initState(vm)

    // 初始化 provide
    initProvide(vm) // resolve provide after data/props

    // 触发 生命周期钩子函数 created
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
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
