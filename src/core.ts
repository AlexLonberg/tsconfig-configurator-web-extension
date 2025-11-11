import type { Component } from 'vue'
import type { Environment, TEnvironmentProps } from './environment.ts'
import type { TLocationHash, TTargetLink, TLink2Target, Resources } from './parser.ts'
import { type TStorageEvent, STORAGE_KEYS } from './storage.ts'

type UMutable<T extends object> = { -readonly [K in keyof T]: T[K] }
type UDeepMutable<T extends object> = { -readonly [K in keyof T]: T[K] extends object ? UDeepMutable<T[K]> : T[K] }

function isPlainObject<T extends Record<string, any>> (value: any): value is T {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * **Warning:** Не проверяет круговые ссылки и, в основно, предназначена для копирования опций.
 */
function deepCopy<T> (value: T): T {
  if (typeof value !== 'object' || value === null) {
    return value
  }
  if (Array.isArray(value)) {
    const arr = [] as any
    for (const item of value) {
      arr.push(deepCopy(item))
    }
    return arr
  }
  const obj = {} as any
  for (const [key, v] of Object.entries(value)) {
    obj[key] = v
  }
  return obj
}

class AsyncLock {
  private readonly _queue: Set<(() => any)> = new Set()
  private _pending = Promise.resolve()

  get acquired (): boolean {
    return this._queue.size > 0
  }

  has (release: (() => void)): boolean {
    return this._queue.has(release)
  }

  async acquire (): Promise<(() => void)> {
    const p = this._pending
    let release!: (() => any)
    this._pending = new Promise<void>((resolve) => {
      release = () => {
        if (this._queue.delete(release)) {
          resolve()
        }
      }
    })
    this._queue.add(release)
    await p
    return release
  }
}

class EventEmitter<T extends Record<string, any>> {
  private _listeners: ((e: T) => any)[] = []

  on (listener: ((e: T) => any)): void {
    if (!this._listeners.includes(listener)) {
      this._listeners.push(listener)
    }
  }

  off (listener: ((e: T) => any)): void {
    for (let i = 0; i < this._listeners.length; ++i) {
      if (this._listeners[i] === listener) {
        this._listeners.splice(i, 1)
        break
      }
    }
  }

  _emit (e: T): void {
    for (const fn of [...this._listeners]) {
      try {
        fn(e)
      } catch { }
    }
  }

  _clear (): void {
    this._listeners.splice(0)
  }
}

function getLocationHash (): null | TLocationHash {
  try {
    const locationHash = document.location.hash
    if (/^#[a-z_-]+$/i.test(locationHash)) {
      return locationHash as TLocationHash
    }
  } catch { }
  return null
}

function findCurrentTarget (link2target: TLink2Target): null | TTargetLink {
  const hash = getLocationHash()
  let target: null | TTargetLink = null
  if (hash) {
    for (const item of link2target.values()) {
      if (hash === item.hash) {
        if (item.isNav) {
          return item
        }
        target = item
      }
    }
  }
  return target
}

/**
 * Обобщенный класс управления общим доступом к разделяемому DOM.
 */
abstract class Panel {
  protected readonly _lock = new AsyncLock()
  protected readonly _env: Environment
  protected _resources: null | Resources = null
  protected readonly _scrollIntoViewOptions: ScrollOptions = { behavior: 'auto' }
  /**
   * Будет установлено, если при открытии панели в адресе окажется хеш
   */
  protected _targetLink: null | TTargetLink = null

  protected readonly _onScrollOption = (e: TStorageEvent) => {
    if (e.key === STORAGE_KEYS.settings) {
      this._scrollIntoViewOptions.behavior = this._env.settings.scrollBehaviorSmooth ? 'smooth' : 'auto'
    }
  }

  protected readonly _click = (e: Event) => {
    const link = e.currentTarget as HTMLAnchorElement
    if (link) {
      const target = this._resources?.link2target.get(link)
      if (target) {
        e.preventDefault()
        window.history.pushState({}, '', target.hash)
        target.target.scrollIntoView(this._scrollIntoViewOptions)
      }
    }
  }

  protected readonly _onHashState = () => {
    this._resources?.hash2target.get(window.location.hash as TLocationHash)?.scrollIntoView(this._scrollIntoViewOptions)
  }

  constructor(env: Environment) {
    this._env = env
  }

  protected _enableIntoView (resources: Resources, enable: boolean) {
    if (enable) {
      for (const item of resources.link2target.keys()) {
        item.addEventListener('click', this._click)
      }
      window.addEventListener('hashchange', this._onHashState)
    }
    else {
      for (const item of resources.link2target.keys()) {
        item.removeEventListener('click', this._click)
      }
      window.removeEventListener('hashchange', this._onHashState)
    }
  }

  /**
   * Вызывается по команде открытия панели и после получения разделяемого DOM.
   */
  protected abstract _open (rs: Resources): Component | Promise<Component>
  /**
   * Вызывается для восстановления DOM. Функция, обратная {@link _open()}, которая должна полностью восстановить
   * изменения и вернуть страницу в исходное состояние.
   */
  protected abstract _close (rs: Resources): void | Promise<void>

  /**
   * Открыть и перестроить DOM. После получения ресурсов, вызывает {@link _open()}.
   */
  async open (): Promise<void> {
    const release = await this._lock.acquire()
    try {
      if (this._resources) {
        return // Страница расширения уже перестроена. Функция могла быть вызвана по ошибке.
      }
      this._resources = await this._env.getResources()
      this._targetLink = findCurrentTarget(this._resources.link2target)
      this._env.storage.on(this._onScrollOption)
      this._onScrollOption({ key: STORAGE_KEYS.settings, type: 'updated' })
      // NOTE Фактически это поле перезаписываемо, но никто этого видеть не должен
      const rProps: UMutable<TEnvironmentProps> = this._env.rProps
      rProps.content = await this._open(this._resources)
    } finally {
      release()
    }
  }

  /**
   * Закрыть и восстановить DOM.
   */
  async close (): Promise<void> {
    const release = await this._lock.acquire()
    const rs = this._resources
    try {
      if (!rs) {
        return // Страница расширения не была открыта.
      }
      this._env.storage.off(this._onScrollOption)
      this._resources = null
      this._targetLink = null
      const rProps: UMutable<TEnvironmentProps> = this._env.rProps
      rProps.content = null
      await this._close(rs)
      rs.release()
    } finally {
      release()
    }
  }
}

function textEditorStub (text = ''): HTMLDivElement {
  return {
    get textContent () { return text },
    set textContent (v: string) { text = v },
    addEventListener (..._: any[]) { /**/ },
    removeEventListener (..._: any[]) { /**/ },
  } as unknown as HTMLDivElement
}

export {
  type UMutable,
  type UDeepMutable,
  isPlainObject,
  deepCopy,
  AsyncLock,
  EventEmitter,
  Panel,
  textEditorStub
}
