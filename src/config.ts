import { h, shallowReactive, reactive, type Component } from 'vue'
import type { CachedStorage, CachedStorageItem, TStorageEvent } from './storage.ts'
import type { TTargetLink, TCategories, Resources } from './parser.ts'
import type { Environment } from './environment.ts'
import type { Settings } from './settings.ts'
import { tags } from './tags.ts'
import { Builder, textDownload } from './json.ts'
import {
  type TOptionKind,
  type TOptionType,
  type TOptionStatus,
  type TOptionRecord,
  type TOptionsKey,
  defaultOption,
  defaultOptionRecord,
  safeValidateOption,
  copyOptionRecord
} from './options.ts'
import { Panel } from './core.ts'
import { Presets, } from './presets.ts'
import Cfg from './Cfg.vue'

type TOptionProps = {
  value: string
  status: TOptionStatus
  onLoaded: number
  invisible: boolean
}

type TOptionValue = {
  key: string // копия значения в виде строки
  value: TOptionType
  selected: boolean
}

class CfgProperty {
  private readonly _env: Environment
  private readonly _target: TTargetLink
  private readonly _options: TOptionType[]
  private readonly _lower: string
  readonly record: CachedStorageItem<TOptionRecord>
  readonly vKey = Symbol()
  readonly kind: TOptionKind
  element: null | HTMLElement = null

  readonly rProps: TOptionProps = shallowReactive({ status: 'on', value: '', onLoaded: 0, invisible: false })
  // Для разных типов поведение этого свойства отличается
  // + kind:object & name:paths|plugins - не поддерживаются и всегда установлены в null
  // + kind:string - только одна ячейка. Если selected, то есть значение, иначе в интерфейсе нужно установить null
  // + kind:enum|boolean - только одно значение, которое явно выбрано(selected)
  // + kind:array - свойство selected не используется, массивы редактируются руками и содержат строки или пусты
  // + name:lib - особый тип массива, который имеет константные значения с выбранными элементами(selected)
  readonly rItems: TOptionValue[] = reactive([])

  private _currentComment: null | string = null
  private _currentStatus: null | TOptionStatus = null
  private _currentValue: null | string = null // строка или массив(в виде строки через запятую)
  private _changedValue: boolean = false
  private _cache = {} as TOptionRecord
  private _sId: any = undefined

  private readonly _onUpdate = (_e: TStorageEvent) => this._load()

  constructor(env: Environment, target: TTargetLink, record: CachedStorageItem<TOptionRecord>, kind: TOptionKind, options: TOptionType[]) {
    this._env = env
    this._target = target
    this.record = record
    this.kind = kind
    this._options = options
    this._lower = this._target.name.toLowerCase()
  }

  get settings (): Settings {
    return this._env.settings
  }

  get storage (): CachedStorage {
    return this._env.storage
  }

  get root (): Configurator {
    return this._env.config
  }

  get name (): string {
    return this._target.name
  }

  getCurrentComment (): string {
    return this._currentComment ?? this._cache.comment
  }

  private _reset (): void {
    clearTimeout(this._sId)
    this.rItems.splice(0)
    this._currentComment = null
    this._currentStatus = null
    this._currentValue = null
    this._changedValue = false
  }

  private _load (): void {
    this._reset()
    const record = copyOptionRecord(this.record.get())
    this._cache = record
    //
    // Конвертируем реальные значения опций, к типу пригодному для использования компонентом
    //
    this.rProps.status = record.status
    // Неподдерживаемые параметры: paths:object и plugins:object[]
    if (this.kind === 'object' || this.name === 'plugins') {
      this.rItems.push({ key: 'null', value: null, selected: true })
      this.rProps.value = 'null'
    }
    else if (this.kind === 'number') {
      const value = record.value as number
      if (this.name === 'maxNodeModuleJsDepth') {
        let nullSelected = true
        for (let i = 0; i < 9; ++i) {
          const selected = i === value
          this.rItems.push({ key: `${i}`, value: i, selected })
          if (selected) {
            this.rProps.value = `${i}`
            nullSelected = false
          }
        }
        if (nullSelected) {
          this.rProps.value = 'null'
        }
        this.rItems.unshift({ key: 'null', value: null, selected: nullSelected })
      }
      // Это не сработает - выше только один такой параметр - maxNodeModuleJsDepth
      else {
        this.rItems.push({ key: String(value), value, selected: true })
        this.rProps.value = String(value)
      }
    }
    // Типы boolean - это enum(null, true, false)
    else if (this.kind === 'boolean' || this.kind === 'enum') {
      for (const value of this._options) {
        const key = String(value)
        const selected = value === record.value
        this.rItems.push({ key, value, selected })
        if (selected) {
          this.rProps.value = key
        }
      }
    }
    else if (this.kind === 'string') {
      const selected = record.value ? true : false
      this.rItems.push({ key: String(record.value), value: record.value as (null | string), selected })
      this.rProps.value = selected ? record.value as string : 'null'
    }
    else if (this.kind === 'array') {
      // Массивы могут быть только null или string[]
      let items = Array.isArray(record.value) ? record.value : []
      // Особый параметр массива с предопределенными значениями, но может быть пустым.
      // Явно приводится валидатором к массиву, даже если там null.
      if (this.name === 'lib') {
        const set = new Set(items)
        items = []
        for (const value of this._options as string[]) {
          const selected = set.has(value)
          this.rItems.push({ key: value, value, selected })
          if (selected) {
            items.push(value)
          }
        }
      }
      else {
        for (const value of items) {
          this.rItems.push({ key: value, value, selected: true })
        }
      }
      this.rProps.value = items.join(', ')
    }
    else {
      this._env.notification.addError([`The parameter ${tags.code(`${this.name}:${this.kind}`)} is unknown and not supported by the configurator.`])
    }
    ++this.rProps.onLoaded
  }

  forceSave () {
    clearTimeout(this._sId)
    let changed = false
    if (this._currentComment !== null && this._cache.comment !== this._currentComment) {
      this._cache.comment = this._currentComment
      changed = true
    }
    if (this._currentStatus && this._cache.status !== this._currentStatus) {
      this._cache.status = this._currentStatus
      changed = true
    }
    if (this._changedValue) {
      if (this.kind === 'object' || this.name === 'plugins') {
        // ... эти  свойства не поддерживаются и не могли быть изменены
      }
      else if (this.kind === 'boolean' || this.kind === 'enum' || this.name === 'maxNodeModuleJsDepth') {
        const item = this.rItems.find((item) => item.selected)
        if (item && this._cache.value !== item.value) {
          changed = true
          this._cache.value = item.value
        }
      }
      else if (this.name === 'lib') {
        changed = true
        const value = []
        for (const item of this.rItems) {
          if (item.selected && item.key !== 'null') {
            value.push(item.value as string)
          }
        }
        this._cache.value = value
      }
      else if (this.kind === 'array') {
        changed = true
        this._cache.value = this._currentValue?.split(/\s*,\s*/).filter((v) => v) ?? []
      }
      else if (this.kind === 'string') {
        const value = (!this._currentValue || this._currentValue === 'null')
          ? (this._options.includes(null) ? null : '')
          : this._currentValue
        if (this._cache.value !== value) {
          changed = true
          this._cache.value = value
        }
      }
      else {
        this._env.notification.addError([`Logical error: The parameter ${tags.code(`${this.name}:${this.kind}`)} was not handled by the ${tags.code('CfgProperty.forceSave()')} method.`])
      }
    }
    if (changed) {
      this.record.set(this._cache)
    }
  }

  private _save (): void {
    clearTimeout(this._sId)
    this._sId = setTimeout(() => this.forceSave(), 300)
  }

  private _pickEnum (key: string): void {
    for (const item of this.rItems) {
      const selected = item.key === key
      item.selected = selected
      if (selected) {
        this.rProps.value = item.key
      }
    }
    this._changedValue = true
    this._save()
  }

  private _pickArray_lib (key: string): void {
    // Константный список
    const value = []
    for (const item of this.rItems) {
      if (item.key === key) {
        item.selected = !item.selected
      }
      if (item.selected) {
        value.push(item.key)
      }
    }
    this.rProps.value = value.join(', ')
    this._changedValue = true
    this._save()
  }

  pickItem (key: string): void {
    if (this.kind === 'boolean' || this.kind === 'enum' || this.name === 'maxNodeModuleJsDepth') {
      this._pickEnum(key)
    }
    else if (this.name === 'lib') {
      this._pickArray_lib(key)
    }
    else {
      this._env.notification.addError([`Logical error: The parameter ${tags.code(`${this.name}:${this.kind}`)} should not be processed by the ${tags.code('CfgProperty.forceSave()')} method.`])
    }
  }

  changeString (text: string): void {
    this._currentValue = text.trim()
    this._changedValue = true
    this._save()
  }

  changeComment (text: string): void {
    this._currentComment = text.trim()
    this._save()
  }

  toggleStatus (): TOptionStatus {
    const status = this.rProps.status
    let next: TOptionStatus
    if (status === 'on') {
      next = 'off'
    }
    else if (status === 'off') {
      next = 'ignore'
    }
    else {
      next = 'on'
    }
    this._currentStatus = next
    this.rProps.status = next
    this._save()
    return next
  }

  intoView (): void {
    window.history.pushState({}, '', this._target.hash)
    this._target.target.scrollIntoView(this.root.scrollIntoViewOptions)
  }

  /**
   * Установить любой элемент, к которому надо перейти при активации панели, если в URL был хеш опции
   */
  setElement (el: null | HTMLElement): void {
    this.element = el
  }

  filter (text: null | string): void {
    const invisible = text ? !this._lower.includes(text) : false
    if (this.rProps.invisible !== invisible) {
      this.rProps.invisible = invisible
    }
  }

  enable (enabled: boolean): void {
    if (enabled) {
      this.rProps.invisible = false
      this.record.on(this._onUpdate)
      this._load()
    }
    else {
      this.record.off(this._onUpdate)
    }
  }
}

class CfgCategory {
  private readonly _env: Environment
  readonly vKey = Symbol()
  readonly storage: CachedStorage
  readonly name: string
  readonly rItems: CfgProperty[] = shallowReactive([])
  private readonly _validator = (key: string, raw: Record<string, any>) => this._validate(key, raw)
  private readonly _factory = (key: string) => this._create(key)

  constructor(env: Environment, name: string, options: readonly TTargetLink[]) {
    this._env = env
    this.storage = env.storage
    this.name = name

    for (const target of options) {
      const [{ kind, options }, errors] = defaultOption(target.name as any)
      if (errors) {
        this._env.notification.addError(errors)
      }
      const record = env.storage.getStorageOption<TOptionRecord>(target.name, this._validator, this._factory)
      this.rItems.push(new CfgProperty(env, target, record, kind, options))
    }
  }

  get settings (): Settings {
    return this._env.settings
  }

  private _create (key: string): TOptionRecord {
    const [value, errors] = defaultOptionRecord(key as TOptionsKey)
    if (errors && errors.length > 0) {
      this._env.notification.addError(errors)
    }
    return value
  }

  private _validate (key: string, raw: Record<string, any>): [boolean, TOptionRecord] {
    const [value, errors] = safeValidateOption(key as TOptionsKey, raw as TOptionRecord)
    const isErr = errors && errors.length > 0
    if (isErr) {
      this._env.notification.addError(errors)
    }
    // Здесь при ошибке передается именно false. Хранилище получив false - перезапишет значение.
    return [!isErr, value]
  }

  filter (text: null | string): void {
    for (const item of this.rItems) {
      item.filter(text)
    }
  }

  enable (enabled: boolean): void {
    for (const item of this.rItems) {
      item.enable(enabled)
    }
  }

  async forceSave (): Promise<void> {
    const promises = []
    for (const prop of this.rItems) {
      promises.push(prop.forceSave())
    }
    await Promise.all(promises)
  }
}

class Configurator extends Panel {
  private readonly _globalClickListeners: Set<(() => any)> = new Set()
  readonly presets: Presets
  readonly rItems: CfgCategory[] = shallowReactive([])
  private _initialized: 0 | 1 | 2 = 0
  private _tId = undefined as any

  private readonly _on = (type: 'mounted' | 'unmounted') => {
    if (type === 'mounted') {
      if (this._resources) {
        this._rebuild(this._resources)
      }
      else {
        this._env.notification.addError([`Warning: ${tags.code('Configurator')} did not receive or has already released resources, but it received a "mounted" event from the component.`])
      }
    }
    else if (this._resources) {
      this._close(this._resources)
      this._resources = null
    }
  }

  constructor(env: Environment) {
    super(env)
    this.presets = new Presets(env)
    env.addCleanFn(() => this.close())
  }

  get env (): Environment {
    return this._env
  }

  get scrollIntoViewOptions (): ScrollOptions {
    return this._scrollIntoViewOptions
  }

  globalClickOn (callback: (() => any)): void {
    this._globalClickListeners.add(callback)
  }

  globalClickOff (callback: (() => any)): void {
    this._globalClickListeners.delete(callback)
  }

  globalClickEmit (callback: (() => any)): void {
    for (const cb of this._globalClickListeners) {
      if (callback !== cb) {
        cb()
      }
    }
  }

  filter (text: string, _t?: boolean): void {
    if (_t) {
      const cleaned = text.trim().toLowerCase() || null
      for (const category of this.rItems) {
        category.filter(cleaned)
      }
    }
    else {
      clearTimeout(this._tId)
      this._tId = setTimeout(() => this.filter(text, true), 300)
    }
  }

  private async _ensureInit (ctg: TCategories): Promise<void> {
    const ready = this._env.storage.whenReady()
    if (this._initialized !== 0) {
      return ready
    }
    this._initialized = 1
    await ready
    this._initialized = 2
    this.presets.forceUpdate()
    for (const [_key, { title, options }] of Object.entries(ctg)) {
      const ctg = new CfgCategory(this._env, title, options)
      this.rItems.push(ctg)
    }
  }

  private _rebuild (rs: Resources): void {
    document.body.style.overflow = 'hidden'
    rs.sticky.element.remove()
    this._enableIntoView(rs, true)
    if (this._targetLink) {
      this._targetLink.target.scrollIntoView(this._scrollIntoViewOptions)
      const name = this._targetLink.name
      for (const category of this.rItems) {
        for (const prop of category.rItems) {
          if (prop.name === name) {
            prop.element?.scrollIntoView(this._scrollIntoViewOptions)
            return
          }
        }
      }
    }
  }

  private _enable (enabled: boolean): void {
    for (const category of this.rItems) {
      category.enable(enabled)
    }
  }

  protected async _open (rs: Resources): Promise<Component> {
    if (this._initialized !== 2) {
      await this._ensureInit(rs.categories)
    }
    this._globalClickListeners.clear()
    this._enable(true)
    return h(Cfg, {
      cfg: this,
      description: rs.description.element,
      on: this._on
    })
  }

  protected _close (rs: Resources): void {
    this._enable(false)
    this._enableIntoView(rs, false)
    this._globalClickListeners.clear()
    document.body.style.overflow = ''
    rs.description.parent.insertBefore(rs.description.element, rs.description.point)
    rs.sticky.parent.insertBefore(rs.sticky.element, rs.sticky.point)
  }

  async forceSave (): Promise<void> {
    const promises = []
    for (const category of this.rItems) {
      promises.push(category.forceSave())
    }
    await Promise.all(promises)
  }

  download (): void {
    const builder = new Builder()
    for (const category of this.rItems) {
      builder.addTitle(category.name)
      for (const item of category.rItems) {
        const record = item.record.get()
        if (record.status !== 'ignore') {
          builder.add(record.comment.trim() || null, record.status, item.name, record.value)
        }
      }
    }
    textDownload(builder.toJson(), 'tsconfig.base.json')
  }
}

export {
  type TOptionValue,
  CfgProperty,
  CfgCategory,
  Configurator
}
