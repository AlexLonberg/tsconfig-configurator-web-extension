import { h } from 'vue'
import type { Environment } from './environment.ts'
import { type CachedStorage, type CachedStorageItem, STORAGE_KEYS } from './storage.ts'
import { textDownload, uploadJson } from './json.ts'
import VSettings from './Settings.vue'

const PAGE_LAYOUTS = ['off', 'simple', 'config'] as const
const TITLE_SIZES = ['1em', '1.2em', '1.4em'] as const
const TITLE_WEIGHT = ['normal', 'bold'] as const
type TPageLayout = (typeof PAGE_LAYOUTS)[number]
type TTitleSize = (typeof TITLE_SIZES)[number]
type TTitleWeight = (typeof TITLE_WEIGHT)[number]
type TSettingsRecord = {
  readonly hideIgnoredOptions: boolean
  readonly pageLayout: TPageLayout
  readonly scrollBehaviorSmooth: boolean
  readonly titleSize: TTitleSize
  readonly titleWeight: TTitleWeight
}

function defaultSettings (): TSettingsRecord {
  return {
    hideIgnoredOptions: false,
    pageLayout: 'off',
    scrollBehaviorSmooth: false,
    titleSize: '1em',
    titleWeight: 'normal'
  }
}

function safeValidateSettings (_key: string, raw: Record<string, any>): [boolean, TSettingsRecord] {
  try {
    const hideIgnoredOptions = raw.hideIgnoredOptions
    const pageLayout = raw.pageLayout
    const scrollBehaviorSmooth = raw.scrollBehaviorSmooth
    const titleSize = raw.titleSize
    const titleWeight = raw.titleWeight

    if (
      typeof hideIgnoredOptions === 'boolean' &&
      typeof scrollBehaviorSmooth === 'boolean' &&
      PAGE_LAYOUTS.includes(pageLayout) &&
      TITLE_SIZES.includes(titleSize) &&
      TITLE_WEIGHT.includes(titleWeight)
    ) {
      return [true, {
        hideIgnoredOptions,
        pageLayout,
        scrollBehaviorSmooth,
        titleSize,
        titleWeight
      }]
    }
  } catch { }

  return [false, defaultSettings()]
}

class Settings {
  private readonly _env: Environment
  readonly storage: CachedStorage
  readonly record: CachedStorageItem<TSettingsRecord>
  private _opened: null | (() => void) = null

  constructor(env: Environment) {
    this._env = env
    this.storage = env.storage
    this.record = env.storage.getStorageItem(STORAGE_KEYS.settings, safeValidateSettings, defaultSettings)
  }

  get hideIgnoredOptions (): boolean {
    return this.record.get().hideIgnoredOptions
  }

  get pageLayout (): TPageLayout {
    return this.record.get().pageLayout
  }

  get scrollBehaviorSmooth (): boolean {
    return this.record.get().scrollBehaviorSmooth
  }

  get titleSize (): TTitleSize {
    return this.record.get().titleSize
  }

  get titleWeight (): TTitleWeight {
    return this.record.get().titleWeight
  }

  toggleHideIgnoredOptions () {
    const cur = { ...this.record.get() }
    cur.hideIgnoredOptions = !cur.hideIgnoredOptions
    this.record.set(cur)
  }

  setPageLayout (pageLayout: TPageLayout): void {
    const cur = this.record.get()
    if (PAGE_LAYOUTS.includes(pageLayout) && cur.pageLayout !== pageLayout) {
      this.record.set({ ...cur, pageLayout })
    }
  }

  setScrollBehaviorSmooth (value: boolean): void {
    const cur = this.record.get()
    if (cur.scrollBehaviorSmooth !== value) {
      this.record.set({ ...cur, scrollBehaviorSmooth: !!value })
    }
  }

  setTitleSize (size: TTitleSize): void {
    const cur = this.record.get()
    if (TITLE_SIZES.includes(size) && cur.titleSize !== size) {
      this.record.set({ ...cur, titleSize: size })
    }
  }

  setTitleWeight (weight: TTitleWeight): void {
    const cur = this.record.get()
    if (TITLE_WEIGHT.includes(weight) && cur.titleWeight !== weight) {
      this.record.set({ ...cur, titleWeight: weight })
    }
  }

  download (): void {
    const json = this._env.storage.toJsonText()
    textDownload(json, 'ts_config_extension_local_storage.json')
  }

  async upload (): Promise<void> {
    try {
      const json = await uploadJson()
      await this._env.storage.fromJson(json)
    } catch { }
  }

  clear (): void {
    this._env.storage.clear()
  }

  open () {
    if (this._opened) {
      return
    }
    this._opened = this._env.showDialog(h(VSettings, {
      settings: this,
      close: () => this._env.control.settingsClose()
    }))
  }

  close () {
    this._opened?.()
    this._opened = null
  }
}

export {
  type TSettingsRecord,
  type TPageLayout,
  type TTitleSize,
  type TTitleWeight,
  Settings
}
