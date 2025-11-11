/// <reference types="vite/client" />
import _css from './style.module.css'

const css = Object.freeze({
  css_host: _css['css_host'],
  // Окна
  control_panel: _css['control_panel'],
  dialog_panel: _css['dialog_panel'],
  content_wrapper: _css['content_wrapper'],
  content_navigation: _css['content_navigation'],
  content_description: _css['content_description'],
  content_config: _css['content_config'],
  // Области
  header: _css['header'],
  content: _css['content'],
  footer: _css['footer'],
  // Модификаторы
  dialog_error: _css['dialog_error'],
  // Кнопки
  btn: _css['btn'],
  icon: _css['icon'],
  // Состояния
  active: _css['active'],
  pressed: _css['pressed'],
  // Текст
  title: _css['title'],
  label: _css['label'],
  tag_hr: _css['tag_hr'],
  tag_code_inline: _css['tag_code_inline'],

  notranslate: 'notranslate'
} as const)

const tags = {
  code (text: string) {
    return `<code class="${css.tag_code_inline}">${text}</code>`
  },
  hr () {
    return `<hr class="${css.tag_hr}">`
  }
}

const stub = {
  _div: null as any,
  _anchor: null as any,
  get div (): HTMLDivElement {
    return stub._div ?? (stub._div = document.createElement('div'))
  },
  get anchor (): HTMLAnchorElement {
    return stub._anchor ?? (stub._anchor = document.createElement('a'))
  }
}

export {
  css,
  tags,
  stub
}
