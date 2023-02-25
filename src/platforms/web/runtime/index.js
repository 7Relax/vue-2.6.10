/* @flow */

import Vue from 'core/index'
import config from 'core/config'
import { extend, noop } from 'shared/util'
import { mountComponent } from 'core/instance/lifecycle'
import { devtools, inBrowser } from 'core/util/index'

import {
  query,
  mustUseProp,
  isReservedTag,
  isReservedAttr,
  getTagNamespace,
  isUnknownElement
} from 'web/util/index'

import { patch } from './patch'
import platformDirectives from './directives/index'
import platformComponents from './components/index'

// install platform specific utils
Vue.config.mustUseProp = mustUseProp
Vue.config.isReservedTag = isReservedTag
Vue.config.isReservedAttr = isReservedAttr
Vue.config.getTagNamespace = getTagNamespace
Vue.config.isUnknownElement = isUnknownElement

// install platform runtime directives & components
// 注册与平台相关的全局指令 v-model v-show
// 注册与平台相关的全局组件 Transition TransitionGroup
// extend 方法作用：把第二个参数的所有成员 拷贝到 第一个参数中去
extend(Vue.options.directives, platformDirectives)
extend(Vue.options.components, platformComponents)

// install platform patch function
// 在 Vue 的原型对象上注册了一个 __patch__ 函数，其功能：把虚拟DOM 转换成 真实DOM
Vue.prototype.__patch__ = inBrowser ? patch : noop // noop 是一个空函数

// public mount method
// 注册 $mount
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && inBrowser ? query(el) : undefined
  // mountComponent 这个方法是和平台无关的，是 Vue 的核心代码
  return mountComponent(this, el, hydrating)
}

// devtools global hook
/* istanbul ignore next */
if (inBrowser) {
  setTimeout(() => {
    if (config.devtools) {
      if (devtools) {
        devtools.emit('init', Vue)
      } else if ( process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test' ) {
        // console[console.info ? 'info' : 'log'](
        //   'Download the Vue Devtools extension for a better development experience:\n' +
        //   'https://github.com/vuejs/vue-devtools'
        // )
      }
    }
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test' &&
      config.productionTip !== false && typeof console !== 'undefined' ) {
      // console[console.info ? 'info' : 'log'](
      //   `You are running Vue in development mode.\n` +
      //   `Make sure to turn on production mode when deploying for production.\n` +
      //   `See more tips at https://vuejs.org/guide/deployment.html`
      // )
    }
  }, 0)
}

export default Vue
