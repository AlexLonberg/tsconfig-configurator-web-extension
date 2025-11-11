import { shallowReactive } from 'vue'
import type { Environment } from './environment.ts'

type TControlProps = {
  content: boolean
  config: boolean
  settings: boolean
  notification: boolean
}

class Control {
  private readonly _env: Environment
  readonly rProps: TControlProps = shallowReactive({
    content: false,
    config: false,
    settings: false,
    notification: false
  })

  constructor(env: Environment) {
    this._env = env
  }

  content (): void {
    const active = !this.rProps.content
    this.rProps.content = active
    if (active) {
      this.rProps.config = false
      this._env.config.close()
      this._env.content.open()
    }
    else {
      this._env.content.close()
    }
  }

  config (): void {
    const active = !this.rProps.config
    this.rProps.config = active
    if (active) {
      this.rProps.content = false
      this._env.content.close()
      this._env.config.open()
    }
    else {
      this._env.config.close()
    }
  }

  settings (): void {
    const active = !this.rProps.settings
    this.rProps.settings = active
    if (active) {
      this._env.settings.open()
    }
    else {
      this._env.settings.close()
    }
  }

  settingsClose (): void {
    this.rProps.settings = false
    this._env.settings.close()
  }

  activateNotification (value: boolean): void {
    this.rProps.notification = value
  }

  notification (): void {
    this.rProps.notification = false
    this._env.notification.open()
  }

  quit (): void {
    this._env.quit()
  }
}

export {
  type TControlProps,
  Control
}
