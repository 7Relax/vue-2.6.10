/* @flow */

import { mergeOptions } from '../util/index'

export function initMixin (Vue: GlobalAPI) {
  Vue.mixin = function (mixin: Object) {
    // 将 mixin 对象中的成员拷贝到 this.options 中
    // this.options 就是 Vue.options
    // 所以通过 Vue.mixin 注册的是全局的 mixin
    this.options = mergeOptions(this.options, mixin)
    return this
  }
}
