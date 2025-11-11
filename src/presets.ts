import { shallowReactive, reactive, h } from 'vue'
import { tags } from './tags.ts'
import { type UDeepMutable, type UMutable, AsyncLock } from './core.ts'
import { type CachedStorageItem, type TStorageEvent, STORAGE_KEYS } from './storage.ts'
import type { Environment } from './environment.ts'
import VPreset from './Preset.vue'

/**
 * Опции пресета - уникальный ключ и пользовательское имя.
 *
 * Для справки: Опции компиляции хранятся с такими ключами: `compilerOption.[TPresetOptions.key].[option]`.
 */
type TPresetOptions = {
  readonly key: string
  readonly name: string
  readonly description: string
}

/**
 * Запись в хранилище.
 */
type TPresetsRecord = {
  /**
   * Активный пресет(последний выбранный в интерфейсе). Должен быть равен одному из ключей {@link TPresetOptions}.
   */
  readonly active: string,
  /**
   * Не может быть пустым.
   */
  readonly items: readonly TPresetOptions[]
}

type TPresetItem = {
  readonly key: string
  readonly name: string
  readonly description: string
  readonly selected: boolean
  readonly disabled: boolean
}

type TPresetsProps = {
  readonly preset: string
  readonly disabled: boolean
}

function defaultPresetsRecord () {
  return {
    active: 'default',
    items: [{ key: 'default', name: 'Default', description: '' }]
  }
}

/**
 * Валидирует пресет.
 *
 * Если возвращаются ошибки - следует обновить запись хранилища с корректным пресетом или с пресетом по умолчанию.
 */
function safeValidatePresetsRecord (raw: Record<string, any>): [UDeepMutable<TPresetsRecord>, null | string[]] {
  try {
    let active = raw.active as string
    const rawItems = raw.items
    if (typeof active !== 'string' || !Array.isArray(rawItems)) {
      throw null
    }

    const errors: Set<string> = new Set()
    const set = new Set()
    const items: TPresetOptions[] = []

    for (const item of rawItems) {
      let key!: string
      let name!: string
      if (
        typeof item !== 'object' || item === null ||
        typeof item.key !== 'string' || (key = item.key).length === 0 ||
        typeof item.name !== 'string' || (name = item.name).length === 0
      ) {
        errors.add(`An item in the list ${tags.code('TPresetsRecord.items[]')} must be a valid ${tags.code('TPresetOptions')}.`)
        continue
      }
      if (set.has(key)) {
        errors.add(`An item in the list ${tags.code('TPresetsRecord.items[]')} has a duplicate preset key ${tags.code(`TPresetOptions.key:"${key}"`)} пресета.`)
        continue
      }
      let description = item.description
      if (typeof description !== 'string') {
        description = ''
      }
      set.add(key)
      items.push({ key, name, description })
    }

    if (!set.has(active)) {
      errors.add(`The active preset ${tags.code(`TPresetsRecord.active:"${active}"`)} is not present in the list of presets ${tags.code('TPresetsRecord.items[]')}.`)
      if (items.length > 0) {
        active = items[0].key
      }
      else {
        errors.add(`The list of presets ${tags.code('TPresetsRecord.items[]')} cannot be empty.`)
        return [defaultPresetsRecord(), [...errors]]
      }
    }

    return [{ active, items }, errors.size > 0 ? [...errors] : null]
  } catch { }

  return [defaultPresetsRecord(), [`The preset object must be of type ${tags.code('TPresetsRecord')}.`]]
}

function copyPresetsRecord (presets: TPresetsRecord): UDeepMutable<TPresetsRecord> {
  return { active: presets.active, items: presets.items.map(({ key, name, description }) => ({ key, name, description })) }
}

type TPresetDialogMode = 'edit' | 'create'
type TPresetDialogResult = 'save' | 'remove' | 'close'
type TPresetDialogOptions = {
  name: string
  description: string
}
type TPresetDialogCloseFn = ((key: TPresetDialogResult, options: TPresetDialogOptions) => any)
type _TDialogResult = [TPresetDialogResult, TPresetDialogOptions]

class Presets {
  private readonly _presetsLock = new AsyncLock()
  private readonly _env: Environment
  private readonly _record: CachedStorageItem<TPresetsRecord>
  readonly rProps: TPresetsProps = shallowReactive({ preset: 'default', disabled: false })
  readonly rItems: readonly TPresetItem[] = reactive([{ key: 'default', name: 'Default', description: '', selected: false, disabled: false }])

  private readonly _onUpdatePresets = (_e: TStorageEvent) => this._rebuildPresets()
  private readonly _validatePresets = (_key: string, raw: Record<string, any>): [boolean, TPresetsRecord] => {
    const [pr, errors] = safeValidatePresetsRecord(raw)
    if (errors) {
      this._env.notification.addError(errors)
      return [false, pr]
    }
    return [true, pr]
  }

  constructor(env: Environment) {
    this._env = env
    this._record = env.storage.getStorageItem(STORAGE_KEYS.presets, this._validatePresets, defaultPresetsRecord)
    this._record.on(this._onUpdatePresets)
    env.addCleanFn(() => this._record.off(this._onUpdatePresets))
  }

  private _rebuildPresets (presets?: UDeepMutable<TPresetsRecord>): void {
    const cur = presets ?? copyPresetsRecord(this._record.get())
    const rProps = this.rProps as UMutable<TPresetsProps>
    const rItems = this.rItems as UMutable<TPresetItem>[]
    rProps.preset = cur.active

    const allPresets = new Map(cur.items.map(({ key, name, description }) => [key, [name, description]]))
    for (let i = rItems.length - 1; i >= 0; --i) {
      const key = rItems[i].key
      const item = allPresets.get(key)
      if (item) {
        allPresets.delete(key)
        rItems[i].name = item[0]
        rItems[i].description = item[1]
        rItems[i].selected = key === cur.active
      }
      else {
        rItems.splice(i, 1)
      }
    }
    for (const [key, [name, description]] of allPresets) {
      rItems.push({ key, name, description, selected: key === cur.active, disabled: rProps.disabled })
    }
    if (this._env.storage.preset !== cur.active) {
      this._env.storage.changePreset(cur.active)
    }
  }

  private _disable (disabled: boolean): void {
    const rProps = this.rProps as UMutable<TPresetsProps>
    const rItems = this.rItems as UMutable<TPresetItem>[]
    rProps.disabled = disabled
    for (const item of rItems) {
      item.disabled = disabled
    }
  }

  private async _acquire (): Promise<(() => any)> {
    const release = await this._presetsLock.acquire()
    this._disable(true)
    return () => {
      this._disable(false)
      release()
    }
  }

  private _openDialog (mode: TPresetDialogMode, options: TPresetDialogOptions): Promise<_TDialogResult> {
    let close!: TPresetDialogCloseFn
    // eslint-disable-next-line prefer-const
    let closeDialog!: (() => void)
    const p: Promise<_TDialogResult> = new Promise((resolve) => {
      close = (key: TPresetDialogResult, opts: TPresetDialogOptions) => {
        closeDialog()
        resolve([key, opts])
      }
    })
    const com = h(VPreset, { mode, options, close })
    closeDialog = this._env.showDialog(com)
    return p
  }

  async createPreset (): Promise<void> {
    if (this._presetsLock.acquired) {
      return
    }
    const release = await this._acquire()
    await this._env.config.forceSave()
    try {
      const [status, { name, description }] = await this._openDialog('create', { name: '', description: '' })
      if (status === 'save' && name.length > 0) {
        const key = crypto.randomUUID()
        const preset = { key, name, description }
        const presets = copyPresetsRecord(this._record.get())
        presets.active = key
        presets.items.push(preset)
        this._record.set(presets)
        this._env.storage.addPreset(key)
        this._rebuildPresets(presets)
      }
    } finally {
      release()
    }
  }

  async editPreset (key: string): Promise<void> {
    if (this._presetsLock.acquired) {
      return
    }
    const release = await this._acquire()
    try {
      const presets = copyPresetsRecord(this._record.get())
      let index = -1
      let preset!: UMutable<TPresetOptions>
      for (let i = 0; i < presets.items.length; ++i) {
        preset = presets.items[i]
        if (preset.key === key) {
          index = i
          break
        }
      }
      if (index < 0) {
        this._env.notification.addError([`Preset with key ${tags.code(key)} was not found in the current list.`])
        this._rebuildPresets(presets)
        return
      }
      const [status, { name, description }] = await this._openDialog('edit', { name: preset.name, description: preset.description })
      if (status === 'save' && name.length > 0) {
        preset.name = name
        preset.description = description
        this._record.set(presets)
        this._rebuildPresets(presets)
      }
      else if (status === 'remove') {
        presets.items.splice(index, 1)
        let active!: string
        if (presets.items.length > 0) {
          active = presets.items[0].key
          presets.active = active
        }
        else {
          active = key
          presets.active = key
          presets.items.push({ key, name, description })
        }
        this._record.set(presets)
        this._env.storage.removePreset(key, active)
        this._rebuildPresets(presets)
      }
    } finally {
      release()
    }
  }

  async changePreset (key: string): Promise<void> {
    const release = await this._acquire()
    try {
      const presets = copyPresetsRecord(this._record.get())
      if (presets.active === key) {
        return
      }
      if (!presets.items.some((item) => item.key === key)) {
        this._env.notification.addError([`Preset with key ${tags.code(key)} was not found.`])
        return
      }
      await this._env.config.forceSave()
      presets.active = key
      this._record.set(presets)
      this._env.storage.changePreset(key)
      this._rebuildPresets()
    } finally {
      release()
    }
  }

  forceUpdate (): void {
    this._rebuildPresets()
  }
}

export {
  type TPresetOptions,
  type TPresetsRecord,
  defaultPresetsRecord,
  safeValidatePresetsRecord,
  copyPresetsRecord,
  type TPresetDialogMode,
  type TPresetDialogResult,
  type TPresetDialogOptions,
  type TPresetDialogCloseFn,
  Presets
}
