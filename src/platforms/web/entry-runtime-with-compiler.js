/* @flow */

import config from 'core/config'
import { warn, cached } from 'core/util/index'
import { mark, measure } from 'core/util/perf'

import Vue from './runtime/index'
import { query } from './util/index'
import { compileToFunctions } from './compiler/index'
import { shouldDecodeNewlines, shouldDecodeNewlinesForHref } from './util/compat'

const idToTemplate = cached(id => {
  const el = query(id)
  return el && el.innerHTML
})

// entry-runtime-with-compiler.js 这个文件是打包时候的入口文件

// 保留 Vue 实例的 $mount 方法 - 目的是重写这个 mount 方法，给 mount 方法添加新功能（可以编译模板）
const mount = Vue.prototype.$mount
// $mount 是在什么地方调用的呢？--- 在 Vue 的实例方法_init() 中调用的
Vue.prototype.$mount = function (
  el?: string | Element,
  // 非ssr情况下为 false，ssr时候为true
  hydrating?: boolean
): Component {
  // 获取 el 对象
  el = el && query(el)

  /* istanbul ignore if */
  // el 不能是 body 或者 html
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' && warn(
      // Vue 不能挂载到 html 或 body 标签上来，只能挂载到普通的元素上
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    // 直接返回 Vue 实例
    return this
  }

  const options = this.$options
  // 如果没有 rander 选项，把会把 template 或 el 转换成 render 函数
  if (!options.render) { // 有 render 函数 则不会处理 template
    // 取模板
    let template = options.template
    // 如果模板存在
    if (template) {
      if (typeof template === 'string') { // 模板是否为字符串
        // 如果模板是 id 选择器
        if (template.charAt(0) === '#') {
          // 获取对应的 DOM 元素的 innerHTML
          template = idToTemplate(template)
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) { // 模板是一个 DOM 元素
        template = template.innerHTML
      } else {
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }
    } else if (el) {
      // 没有模板 - 就使用 el 对应元素的内容当成模板
      template = getOuterHTML(el)
    }
    if (template) {
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile')
      }

      const { render, staticRenderFns } = compileToFunctions(template, {
        outputSourceRange: process.env.NODE_ENV !== 'production',
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,
        delimiters: options.delimiters,
        comments: options.comments
      }, this)
      options.render = render
      options.staticRenderFns = staticRenderFns

      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }
  // 调用 mount 方法，将 render 中的内容渲染出来
  return mount.call(this, el, hydrating)
}

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 */
function getOuterHTML (el: Element): string {
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    const container = document.createElement('div')
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}

// 注册 compile，这个方法接收一个 HTML 字符串，然后返回 render 函数，即手工将模板转换成render函数
Vue.compile = compileToFunctions

export default Vue
