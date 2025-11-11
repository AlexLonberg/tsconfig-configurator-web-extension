import { type Component, shallowReactive } from 'vue'
import { type UMutable, AsyncLock } from './core.ts'
import { type NsCachedStorage, NsCachedStorageImpl } from './storage.ts'
import { Resources } from './parser.ts'
import { Notifications } from './notifications.ts'
import { Control } from './control.ts'
import { Settings } from './settings.ts'
import { Content } from './content.ts'
import { Configurator } from './config.ts'

type TEnvironmentProps = {
  /** Основной контен, перекрывающий приложение сайта - может быть только один. */
  readonly content: null | Component
  /** Диалоговое окно ошибок и предупреждений - может быть только одно. */
  readonly modal: null | Component
}

class Environment {
  private _clean: (() => any)[] = []
  private _modalLock = new AsyncLock()
  readonly rProps: TEnvironmentProps = shallowReactive({ content: null, modal: null })
  /** Независимые панели, например Settings */
  readonly rFloats: { key: symbol, item: Component }[] = shallowReactive([])

  readonly storage: NsCachedStorage
  readonly settings: Settings
  readonly control: Control
  readonly notification: Notifications
  readonly content: Content
  readonly config: Configurator

  // NOTE После запуска приложения - инициализация обязательна.
  private _resources!: Resources

  constructor(debounce: number) {
    this.storage = new NsCachedStorageImpl(debounce, (error) => this.notification.addError([error]))
    this.settings = new Settings(this)
    this.control = new Control(this)
    this.notification = new Notifications(this)
    this.content = new Content(this)
    this.config = new Configurator(this)
  }

  /**
   * **Warning:** После запуска приложения - инициализация обязательна.
   */
  async init (): Promise<void> {
    const [fatal, rs, errors] = Resources.create()
    this._resources = rs
    if (fatal) {
      this.notification.addError(errors)
      await this.notification.open()
      this.quit()
      return
    }
    if (errors.length > 0) {
      this.notification.addError(errors)
    }
    await this.storage.whenReady()
    if (this.settings.pageLayout === 'simple') {
      this.control.content()
    }
    else if (this.settings.pageLayout === 'config') {
      this.control.config()
    }
  }

  async getResources (): Promise<Resources> {
    return this._resources._acquire()
  }

  async showModal (com: Component, p: Promise<void>): Promise<void> {
    const release = await this._modalLock.acquire()
    const rProps: UMutable<TEnvironmentProps> = this.rProps
    try {
      rProps.modal = com
      await p
    } finally {
      rProps.modal = null
      release()
    }
  }

  showDialog (item: Component): (() => void) {
    this.rFloats.push({ key: Symbol(), item })
    return () => {
      for (let i = 0; i < this.rFloats.length; ++i) {
        if (this.rFloats[i].item === item) {
          this.rFloats.splice(i, 1)
          break
        }
      }
    }
  }

  /**
   * Добавить синхронные/асинхронные функции освобождения ресурсов при выходе из приложения.
   */
  addCleanFn (...fns: (() => any)[]): void {
    for (const fn of fns.reverse()) {
      this._clean.unshift(fn) // [1, 2], [3, 4] -> [3, 4], [1, 2]
    }
  }

  async quit (): Promise<void> {
    this._clean.unshift(() => this.storage.save())
    // this.notification.addError([`Выход из приложения ${tags.code('Compiler Options')}.`, tags.hr(), 'Это тестовая ошибка.'])
    const fns = this._clean.splice(0)
    for (const fn of fns) {
      try {
        await fn()
      } catch (e) {
        console.error('[TS Extension] Error during application exit.', e)
      }
    }
  }
}

export {
  type TEnvironmentProps,
  Environment
}
