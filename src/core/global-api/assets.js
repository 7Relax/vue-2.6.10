/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { isPlainObject, validateComponentName } from '../util/index'

export function initAssetRegisters (Vue: GlobalAPI) {
  console.log('initAssetRegisters() - 被调用 ...')
  /**
   * Create asset registration methods.
   */
  // 遍历 ASSET_TYPES 数组，为 Vue 定义相应方法
  // ASSET_TYPES 包括了 component, directive, filter
  ASSET_TYPES.forEach(type => {
    Vue[type] = function (
      id: string, // 组件/指令/过滤器的名字
      definition: Function | Object
    ): Function | Object | void {
      if (!definition) {
        // this 是 Vue 构造函数，所以是 Vue.options
        // 只有一个参数，则返回已注册的相关内容
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          validateComponentName(id)
        }
        if (type === 'component' && isPlainObject(definition)) {
          definition.name = definition.name || id
          // global-api/index.js 中 Vue.options._base = Vue
          // Vue.extend() 就是把一个普通的对象转换成一个组件的构造函数 VueComponent 并返回
          definition = this.options._base.extend(definition)
        }
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition }
        }
        // Vue.options 全局注册
        this.options[type + 's'][id] = definition
        return definition
      }
    }
  })
}
