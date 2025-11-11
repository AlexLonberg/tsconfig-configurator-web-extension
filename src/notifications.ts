import { h } from 'vue'
import type { Environment } from './environment.ts'
import { tags } from './tags.ts'
import Not from './Notifications.vue'

class Notifications {
  private readonly _env: Environment
  private readonly _errors: string[] = []
  private _opened: null | { p: Promise<void>, close: (() => void) } = null

  constructor(env: Environment) {
    this._env = env
  }

  addError (errors: string[]): void {
    if (errors.length > 0) {
      if (this._errors.length > 0) {
        this._errors.push(tags.hr())
      }
      this._errors.push(...errors)
      this._env.control.activateNotification(true)
    }
  }

  async open (): Promise<void> {
    await this._opened?.p
    this._env.control.activateNotification(false)
    const messages = this._errors.splice(0)
    if (messages.length === 0) {
      return
    }
    let close!: (() => void)
    const p: Promise<void> = new Promise((resolve) => {
      let no = true
      close = () => {
        if (no) {
          no = false
          this._opened = null
          resolve()
        }
      }
    })
    this._opened = { p, close }
    this._env.showModal(h(Not, { messages, close }), p)
    return p
  }

  close (): void {
    this._opened?.close()
  }
}

export {
  Notifications
}
