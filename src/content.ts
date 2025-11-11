import { type Component, h } from 'vue'
import type { Environment } from './environment.ts'
import type { Resources } from './parser.ts'
import { Panel } from './core.ts'
import { tags } from './tags.ts'
import Wrapper from './Content.vue'

class Content extends Panel {
  private readonly _on = (type: 'mounted' | 'unmounted') => {
    if (type === 'mounted') {
      if (this._resources) {
        this._rebuild(this._resources)
      }
      else {
        this._env.notification.addError([`Warning: ${tags.code('Content')} did not receive or has already released resources, but it received a "mounted" event from the component.`])
      }
    }
    else if (this._resources) {
      this._close(this._resources)
      this._resources = null
    }
  }

  constructor(env: Environment) {
    super(env)
    env.addCleanFn(() => this.close())
  }

  protected _rebuild (rs: Resources): void {
    // Если не запретить прокрутку - появляется фантомный скролл(вероятно остаток страницы в фоне), за которым не виден реальный.
    document.body.style.overflow = 'hidden'
    // Удаляем панельку привязанную к верху страницы
    rs.sticky.element.remove()
    // Изменяем стиль колонки
    for (const item of rs.section) {
      item.style.flexDirection = 'column'
    }
    // Привязываем клики к панели описания
    this._enableIntoView(rs, true)
    this._targetLink?.target.scrollIntoView(this._scrollIntoViewOptions)
  }

  protected _open (rs: Resources): Component {
    return h(Wrapper, {
      navigation: rs.navigation.element,
      description: rs.description.element,
      on: this._on
    })
  }

  protected _close (rs: Resources): void {
    document.body.style.overflow = ''
    for (const item of rs.section) {
      item.style.flexDirection = ''
    }
    this._enableIntoView(rs, false)
    rs.navigation.parent.insertBefore(rs.navigation.element, rs.navigation.point)
    rs.description.parent.insertBefore(rs.description.element, rs.description.point)
    rs.sticky.parent.insertBefore(rs.sticky.element, rs.sticky.point)
  }
}

export {
  Content
}
