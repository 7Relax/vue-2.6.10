/* @flow */

import { warn } from 'core/util/index'

export * from './attrs'
export * from './class'
export * from './element'

/**
 * Query an element selector if it's not an element already.
 */
export function query (el: string | Element): Element {
  // 如果 el 是字符串的话，则认为其是选择器
  if (typeof el === 'string') {
    // 找到选择器对应的 DOM 元素
    const selected = document.querySelector(el)
    if (!selected) {
      process.env.NODE_ENV !== 'production' && warn(
        'Cannot find element: ' + el
      )
      // 未找到DOM元素 则创建并返回一个 div 元素
      return document.createElement('div')
    }
    // 找到 则直接返回这个 DOM 元素
    return selected
  } else {
    // 不是字符串，则认为是 DOM 对象，直接返回
    return el
  }
}
