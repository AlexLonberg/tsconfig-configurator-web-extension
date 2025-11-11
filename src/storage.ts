import { isPlainObject, AsyncLock, EventEmitter } from './core.ts'
import { tags } from './tags.ts'

/**
 * Универсальный адаптер к локальному хранилищу сайта или расширения, предполагающий хранение объектов.
 * Значения примитивы не допускаются и будут принудительно удалены.
 */
interface _StorageAdapter {
  all (): Map<string, Record<string, any>> | Promise<Map<string, Record<string, any>>>
  get (key: string): null | Record<string, any> | Promise<null | Record<string, any>>
  set (key: string, value: Record<string, any>): void | Promise<void>
  remove (key: string): void | Promise<void>
  clear (): void | Promise<void>
}

interface _ExStorage {
  get (keys?: string | string[] | object): Promise<Record<string, any>>
  set (key2value: Record<string, Record<string, any>>): Promise<void>
  remove (keys: string | string[]): Promise<void>
  clear (): Promise<void>
}

interface _BrStorage {
  readonly length: number
  key (index: number): null | string
  getItem (key: string): null | string
  setItem (key: string, value: string): void
  removeItem (key: string): void
  clear (): void
}

function createExtensionAdapter (s: _ExStorage): _StorageAdapter {
  const remove = async (key: string) => {
    try {
      await s.remove([key])
    } catch { }
  }
  return {
    async all () {
      const map = new Map()
      try {
        const key2value = await s.get()
        for (const [key, v] of Object.entries(key2value)) {
          if (isPlainObject(v)) {
            map.set(key, v)
          }
          else {
            await remove(key)
          }
        }
      } catch { }
      return map
    },
    async get (key: string) {
      try {
        const entry = await s.get([key])
        if (!Object.hasOwn(entry, key)) {
          return null
        }
        const v = entry[key]
        if (typeof v === 'object' && v !== null) {
          return v
        }
      } catch { }
      await remove(key)
      return null
    },
    async set (key: string, value: Record<string, any>) {
      try {
        await s.set({ [key]: value })
      } catch { }
    },
    remove,
    async clear () {
      try {
        await s.clear()
      } catch { }
    }
  }
}

function createBrowserAdapter (s: _BrStorage): _StorageAdapter {
  const get = (key: string) => {
    let v = s.getItem(key)
    if (v === null) {
      return null
    }
    try {
      v = JSON.parse(v)
      if (isPlainObject(v)) {
        return v as unknown as Record<string, any>
      }
    } catch { }
    s.removeItem(key)
    return null
  }
  return {
    all () {
      const keys: string[] = []
      for (let i = 0; i < s.length; ++i) {
        const key = s.key(i)
        if (key) {
          keys.push(key)
        }
      }
      const map = new Map()
      for (const key of keys) {
        const v = get(key)
        if (v) {
          map.set(key, v)
        }
      }
      return map
    },
    get,
    set (key: string, value: Record<string, any>) {
      try {
        const v = JSON.stringify(value)
        s.setItem(key, v)
      } catch { }
    },
    remove (key: string) {
      s.removeItem(key)
    },
    clear () {
      s.clear()
    }
  }
}

function initAdapter (): _StorageAdapter {
  try {
    const _browser = Reflect.get(globalThis, 'chrome') ?? Reflect.get(globalThis, 'browser')
    const _storage = _browser && Reflect.get(_browser, 'storage')
    const _local = _storage && Reflect.get(_storage, 'local')
    if (_local) {
      return createExtensionAdapter(_local)
    }
  } catch { }
  return createBrowserAdapter(Reflect.get(globalThis, 'localStorage'))
}

/**
 * Валидатор одной записи(гарантированного объекта `{}`) хранилища.
 * Должен вернуть:
 *  + Если запись была ошибочной, то `false` - при этом запись, будет удалена и заменена вторым элементом кортежа.
 *  + Корректный тип.
 */
type TItemValidator<T extends Record<string, any>> = ((key: string, value: Record<string, any>) => [boolean, T])
/**
 * Возвращает корректное значение для ключа, которого не было обнаружено в хранилище.
 */
type TItemFactory<T extends Record<string, any>> = ((key: string) => T)
type TStorageEvent = { readonly key: string, readonly type: 'updated' | 'removed' }
type TStorageListener = ((e: TStorageEvent) => any)
type TOptionKey = `compilerOption.${string}`

function isOptionKey (fullkey: string): fullkey is TOptionKey {
  return fullkey.startsWith('compilerOption.')
}

/**
 * Обеспечивает доступ к одному значению хранилища.
 *
 * **Warning:** Значение должно использоваться только классами непосредственно управляющими этой записью.
 */
abstract class CachedStorageItem<T extends Record<string, any> = Record<string, any>> {
  abstract readonly key: string
  abstract get (): T
  abstract set (value: Record<string, any>): void
  /**
   * **Note:** Событие будет вызвано, только если запись была удалена или обновлена через основной интерфейс
   * {@link CachedStorage}. Изменения через локальный {@link set()} эмитирует события основного класса, но игнорирует
   * локальных(установленных здесь) слушателей.
   */
  abstract on (listener: TStorageListener): void
  abstract off (listener: TStorageListener): void
}

/**
 * Обеспечивает синхронный доступ к хранилищу.
 *
 * Все записи возвращают ссылки и(при изменении) должны копироваться потребителями.
 *
 * Ключи хранилища делятся на два типа:
 *
 *  + `compilerOption.[preset].[name]` - специальный префикс для опций.
 *  + `*.*` - любой другой ключ, который должен иметь минимум два сегмента(чтобы не конфликтовать с `[name]`) и не может
 *            начинаться с зарезервированного `compilerOption.`.
 */
abstract class CachedStorage<T extends Record<string, any> = Record<string, any>> {
  abstract whenReady (): void | Promise<void>
  abstract all<V extends Record<string, any> = T> (): ReadonlyMap<string, V>
  abstract get<V extends Record<string, any> = T> (key: string): null | V
  abstract set (key: string, value: Record<string, any>): void
  abstract remove (key: string): void
  abstract clear (): void
  abstract on (listener: TStorageListener): void
  abstract off (listener: TStorageListener): void
  /**
   * Принудительно(без задержки) сохраняет кешированные значения.
   */
  abstract save (): void | Promise<void>
  /**
   * Выделяет хранилище для одного ключа.
   *
   * **Warning:** Значение должно использоваться только классами непосредственно управляющими этой записью. Если ключ
   * уже был выделен, параметры `validator` и `factory` игнорируются и возвращается кешированный {@link CachedStorageItem}.
   *
   * @param key       Требуемый ключ, за исключением специального пространства имен `compilerOption.*.*`.
   * @param validator Валидатор.
   * @param factory   Фабрика или значение по умолчанию.
   * @throws Завершится ошибкой, если ключом будет зарезервированный `compilerOption.*.*`.
   */
  abstract getStorageItem<V extends Record<string, any> = T> (key: string, validator: TItemValidator<T>, factory: T | TItemFactory<T>): CachedStorageItem<V>
  abstract toJsonText (): string
  abstract fromJson (json: Record<string, any>): Promise<void>
}

/**
 * Специальное хранилище, обеспечивающее изменения пространства имен пресета.
 */
abstract class NsCachedStorage<T extends Record<string, any> = Record<string, any>> extends CachedStorage<T> {
  /**
   * Текущий установленный пресет в пути `compilerOption.[preset].[name]`.
   *
   * **Warning:** Перед использованием {@link CachedStorageItem}, требуется обновить текущий пресет
   * {@link changePreset()}, который по умолчанию, при инициализации класса, равен `default`.
   */
  abstract readonly preset: string
  /**
   * Изменяет текущий пресет или, если параметр `preset` равен активному пресету {@link preset}, уведомляет об
   * обновлении. Все зависимые {@link CachedStorageItem} автоматически получат уведомления.
   *
   * @param preset Требуемое имя пресета. Переключение происходит независимо от сущестования ключей пресета.
   */
  abstract changePreset (preset: string): void
  /**
   * Создает новый пресет на основе активного {@link preset} и тут же на него переключает. Новый пресет копирует
   * записи(по ссылке), которые реально есть в хранилище активного пресета. Все зависимые {@link CachedStorageItem}
   * автоматически получат уведомления о переключении.
   *
   * @param preset Ключ нового пресета, который должен быть uuid4. Если ключ уже есть, значения будут обновлены. Если
   * новый пресет окажется активным {@link preset}, функция ничего не делает и ведет себя подобно {@link changePreset()}.
   */
  abstract addPreset (preset: string): void
  /**
   * Удаляет все ключи пресета и, если удаляемый пресет активен или указан параметр `usePreset`, переключает на другой
   * пресет. Все зависимые {@link CachedStorageItem} автоматически получат уведомления о переключении.
   *
   * Варианты:
   * 1. Удаляемый пресет активен:
   *    Удаляются все ключи пресета. Если параметр `usePreset` не указанан, используется имя удаляемого пресета и
   *    вызывается уведомление об обновлении опций.
   * 2. Удаляемый пресет неактивен:
   *    Удаляются все ключи пресета. Если параметр `usePreset` указанан, вызываются уведомления, даже если указанный
   *    пресет активен, иначе функция завершается без уведомлений.
   *
   * @param preset    Требуемое имя удаляемого пресета.
   * @param usePreset Имя применяемого пресета.
   */
  abstract removePreset (preset: string, usePreset: null | string): void
  /**
   * Принудительная очистка записей пресетов, которые могли быть удалены, но остались в хранилище.
   *
   * Как это работает: Читает все записи опций, и удаляет те, у которых ключ пресета `compilerOption.[preset].[name]` не
   * совпадает ни с одним существующим ключом.
   *
   * @param existing Существующие ключи пресетов, которые нужно оставить:
   *  + Если список пуст, будут очищены все пресеты и вызвано уведомление с активным пресетом.
   *  + Если в списке нет активного пресета и он удален, вызывается уведомление с активным пресетом.
   */
  abstract cleanupPresets (existing: string[]): void
  /**
   * Выделяет хранилище для одного ключа, обеспечивающее синхронизацию с {@link preset}.
   *
   * То же самое как и {@link getStorageItem()}, но применяется только для опций в пространстве имен `'compilerOption.[preset].*'`
   */
  abstract getStorageOption<V extends Record<string, any> = T> (key: string, validator: TItemValidator<T>, factory: T | TItemFactory<T>): CachedStorageItem<V>
}

abstract class _CachedStorageItemBase<T extends Record<string, any> = Record<string, any>> extends CachedStorageItem<T> {
  protected readonly _emitter: EventEmitter<TStorageEvent> = new EventEmitter()
  protected readonly _host: NsCachedStorageImpl<any>
  protected readonly _verifiedKeys: Set<string> = new Set()
  protected readonly _validator: TItemValidator<any>
  protected readonly _factory: TItemFactory<any>
  protected _fullkey: string

  constructor(host: NsCachedStorageImpl<any>, fullkey: string, validator: TItemValidator<any>, factory: T | TItemFactory<any>) {
    super()
    this._host = host
    this._fullkey = fullkey
    this._validator = validator
    this._factory = typeof factory === 'function' ? factory : (() => factory)
  }

  abstract _emit (type: 'updated' | 'removed'): void

  _isOption (): boolean {
    return false // В опциях возвращает true
  }

  _changePreset (_preset: string): void {
    // должна быть реализована только в опциях
  }

  // Вызывается при загрузке файла JSON(полного обновления хранилища), когда элементы не валидированы и процедуру
  // валидации нужно пройти заново.
  _clearVerifiedKeys (): void {
    this._verifiedKeys.clear()
  }

  set (value: Record<string, any>): void {
    this._host._privateSet(this._fullkey, value)
  }

  on (listener: TStorageListener): void {
    this._emitter.on(listener)
  }

  off (listener: TStorageListener): void {
    this._emitter.off(listener)
  }
}

class CachedStorageItemImpl<T extends Record<string, any> = Record<string, any>> extends _CachedStorageItemBase<T> {
  get key (): string {
    return this._fullkey
  }

  _emit (type: 'updated' | 'removed'): void {
    this._emitter._emit({ key: this._fullkey, type })
  }

  private _fallbackGet (raw: any): any {
    let ok: boolean
    let value: any
    try {
      [ok, value] = this._validator(this._fullkey, raw)
    } catch {
      ok = false
      value = this._factory(this._fullkey)
    }
    this._verifiedKeys.add(this._fullkey)
    // Перезаписываем, если значение в хранилище было некорректным
    if (!ok) {
      this._host._privateSet(this._fullkey, value)
    }
    return value
  }

  get<V extends Record<string, any> = T> (): V {
    const raw = this._host.get(this._fullkey)
    // Ключа не существует, возвращаем значение по умолчанию
    if (!raw) {
      return this._factory(this._fullkey)
    }
    // Значение, после чтения из хранилища, прошло проверку
    if (this._verifiedKeys.has(this._fullkey)) {
      return raw
    }
    // Валидируем
    return this._fallbackGet(raw)
  }
}

class CachedStorageOptionImpl<T extends Record<string, any> = Record<string, any>> extends _CachedStorageItemBase<T> {
  private readonly _key: string
  private _preset: string

  constructor(host: NsCachedStorageImpl<any>, fullkey: string, validator: TItemValidator<any>, factory: T | TItemFactory<any>, preset: string, key: string) {
    super(host, fullkey, validator, factory)
    this._preset = preset
    this._key = key
  }

  _isOption (): boolean {
    return true
  }

  get preset (): string {
    return this._preset
  }

  get key (): string {
    return this._key
  }

  _emit (type: 'updated' | 'removed'): void {
    this._emitter._emit({ key: this._key, type })
  }

  _changePreset (preset: string): void {
    if (this._preset !== preset) {
      this._preset = preset
      this._fullkey = `compilerOption.${preset}.${this._key}`
    }
    this._emit('updated') // Явно обновляемся(так задумано)
  }

  private _fallbackGet (raw: any): any {
    let ok: boolean
    let value: any
    try {
      [ok, value] = this._validator(this._key, raw)
    } catch {
      ok = false
      value = this._factory(this._key)
    }
    this._verifiedKeys.add(this._fullkey)
    if (!ok) {
      this._host._privateSet(this._fullkey, value)
    }
    return value
  }

  get<V extends Record<string, any> = T> (): V {
    const raw = this._host.get(this._fullkey)
    if (!raw) {
      return this._factory(this._key)
    }
    if (this._verifiedKeys.has(this._fullkey)) {
      return raw
    }
    return this._fallbackGet(raw)
  }
}

const _RM_MARKER = Symbol()

class NsCachedStorageImpl<T extends Record<string, any> = Record<string, any>> extends NsCachedStorage<T> {
  private readonly _storage: _StorageAdapter = initAdapter()
  private readonly _emitter: EventEmitter<TStorageEvent> = new EventEmitter()
  private readonly _lock = new AsyncLock()
  private readonly _cache: Map<string, Record<string, any>> = new Map()
  private readonly _pending: Map<string, Record<string, any> | { [_RM_MARKER]: null }> = new Map()
  private readonly _items: Map<string, _CachedStorageItemBase<any>> = new Map()
  private readonly _debounce: number
  private readonly _logFn: ((error: string) => any)
  private _whenReady: null | { p: Promise<void>, r: (() => void) }
  private _preset: string = 'default'
  private _tId = undefined as any
  private readonly _deferredWrite = () => this._writeChanges()

  constructor(debounce: number, logFn: ((error: string) => any)) {
    super()
    this._debounce = debounce
    this._logFn = logFn
    let r!: (() => void)
    const p: Promise<void> = new Promise((res) => {
      r = () => {
        this._whenReady = null
        res()
      }
    })
    this._whenReady = { p, r }
    this._init()
  }

  get preset (): string {
    return this._preset
  }

  whenReady (): void | Promise<void> {
    return this._whenReady?.p
  }

  private _setValue (fullkey: string, value: Record<string, any>): void {
    this._cache.set(fullkey, value)
    this._pending.set(fullkey, value)
  }

  private _removeValue (fullkey: string): boolean {
    if (this._cache.delete(fullkey)) {
      this._pending.set(fullkey, { [_RM_MARKER]: null })
      return true
    }
    return false
  }

  private _ensureCompilerOptionPath (fullkey: TOptionKey, callSave: boolean): null | [string, string, string] {
    const path = fullkey.split('.') as [string, string, string]
    if (path.length === 3 && path.every((v) => v.length > 0)) {
      return path
    }
    this._logFn(`[TS Extension] Invalid Compiler Option key: ${tags.code(fullkey)}.`)
    if (this._removeValue(fullkey) && callSave) {
      this._save()
    }
    return null
  }

  private _ensureCompilerOptionKey (fullkey: TOptionKey, callSave: boolean): undefined | string {
    return this._ensureCompilerOptionPath(fullkey, callSave)?.[2]
  }

  private _ensureCompilerOptionPreset (fullkey: TOptionKey, callSave: boolean): undefined | string {
    return this._ensureCompilerOptionPath(fullkey, callSave)?.[1]
  }

  private async _init (): Promise<void> {
    const release = await this._lock.acquire()
    let changed = false
    const updated: string[] = []
    const updatedItems: Set<_CachedStorageItemBase<any>> = new Set()

    try {
      const all = await this._storage.all()
      for (const [fullkey, value] of all) {
        let key: undefined | null | string = null
        if (isOptionKey(fullkey) && !(key = this._ensureCompilerOptionKey(fullkey, false))) {
          changed = true
          continue
        }

        const record = this._pending.get(fullkey)
        if (record) {
          if (_RM_MARKER in record) {
            // Ключ был удален до(или во время) асинхронного чтения
            this._logFn(`Storage key ${tags.code(fullkey)} was deleted before or during ${tags.code('CachedStorage')} initialization. The deletion will be ignored and overwritten by the record from storage.`)
          }
          else {
            // NOTE Никак нельзя узнать, что на самом деле хотел владелец объекта. Может быть хотел изменить, а может еще не
            // получил данные хранилищища и записал значение по умолчанию. Будем надеяться, что читатели проверяют whenReady().
            this._logFn(`Storage key ${tags.code(fullkey)} was changed before or during ${tags.code('CachedStorage')} initialization. The change will be ignored and overwritten by the record from storage.`)
          }
          this._pending.delete(fullkey)
        }

        this._cache.set(fullkey, value)
        updated.push(fullkey)

        const item = key ? this._items.get(key) : this._items.get(fullkey)
        if (item) {
          updatedItems.add(item)
        }
      }

      if (changed) {
        this._save()
      }
      for (const key of updated) {
        this._emitter._emit({ key, type: 'updated' })
      }
      for (const item of updatedItems) {
        item._emit('updated')
      }
    } finally {
      release()
      this._whenReady?.r()
    }
  }

  private async _writeChanges (release?: () => void): Promise<void> {
    const rel = (release && this._lock.has(release)) ? (() => null) : await this._lock.acquire()
    const pending = [...this._pending.entries()]
    this._pending.clear()
    const promise = []
    try {
      for (const [key, value] of pending) {
        if (_RM_MARKER in value) {
          promise.push(this._storage.remove(key))
        }
        else {
          promise.push(this._storage.set(key, value))
        }
      }
      await Promise.all(promise)
    }
    catch { }
    finally {
      rel()
    }
  }

  private _save (): void {
    clearTimeout(this._tId)
    this._tId = setTimeout(this._deferredWrite, this._debounce)
  }

  all<V extends Record<string, any> = T> (): ReadonlyMap<string, V> {
    return this._cache as ReadonlyMap<string, V>
  }

  get<V extends Record<string, any> = T> (key: string): null | V {
    return this._cache.get(key) as V ?? null
  }

  private _emitForItem (fullkey: string, type: 'removed' | 'updated'): void {
    if (isOptionKey(fullkey)) {
      const key = this._ensureCompilerOptionKey(fullkey, true)
      if (key) {
        this._items.get(key)?._emit(type)
      }
    }
    else {
      this._items.get(fullkey)?._emit(type)
    }
  }

  // Эта функция вызывается только из выделенных ключей, чтобы избежать нежелательный рекурсивный emit.
  _privateSet (fullkey: string, value: Record<string, any>): void {
    this._setValue(fullkey, value)
    this._save()
    this._emitter._emit({ key: fullkey, type: 'updated' })
  }

  set (key: string, value: Record<string, any>): void {
    this._privateSet(key, value)
    this._emitForItem(key, 'updated')
  }

  remove (key: string): void {
    if (this._removeValue(key)) {
      this._save()
      this._emitter._emit({ key, type: 'removed' })
      this._emitForItem(key, 'removed')
    }
  }

  clear (): void {
    const keys: string[] = [...this._cache.keys()]
    const items: _CachedStorageItemBase<any>[] = []
    this._cache.clear()
    this._pending.clear()
    for (const fullkey of keys) {
      this._pending.set(fullkey, { [_RM_MARKER]: null })
      if (isOptionKey(fullkey)) {
        const key = this._ensureCompilerOptionKey(fullkey, false)
        const item = key && this._items.get(key)
        if (item) {
          items.push(item)
        }
      }
      else {
        const item = this._items.get(fullkey)
        if (item) {
          items.push(item)
        }
      }
    }
    this._save()
    for (const key of keys) {
      this._emitter._emit({ key, type: 'removed' })
    }
    for (const item of items) {
      item._emit('removed')
    }
  }

  getStorageItem<V extends Record<string, any> = T> (key: string, validator: TItemValidator<T>, factory: T | TItemFactory<T>): CachedStorageItem<V> {
    if (!key.includes('.')) {
      throw new Error(`[TS Extension] Forbidden key "${key}" for the getStorageItem() method.`)
    }
    let item = this._items.get(key)
    if (!item) {
      item = new CachedStorageItemImpl(this, key, validator, factory)
      this._items.set(key, item)
    }
    return item
  }

  getStorageOption<V extends Record<string, any> = T> (key: string, validator: TItemValidator<T>, factory: T | TItemFactory<T>): CachedStorageItem<V> {
    if (key.includes('.')) {
      throw new Error(`[TS Extension] Forbidden key "${key}" for the getStorageOption() method.`)
    }
    let item = this._items.get(key)
    if (!item) {
      const fullkey = `compilerOption.${this._preset}.${key}`
      item = new CachedStorageOptionImpl(this, fullkey, validator, factory, this._preset, key)
      this._items.set(key, item)
    }
    return item
  }

  changePreset (preset: string): void {
    this._preset = preset
    for (const item of [...this._items.values()]) {
      // Тип можно не проверять - для НЕ опций, это noop
      item._changePreset(preset)
    }
  }

  addPreset (preset: string): void {
    const inheritFrom = this._preset
    if (preset === inheritFrom) {
      this.changePreset(preset)
      return
    }

    let changed = false
    const existsKeys: Map<string, [TOptionKey, TOptionKey]> = new Map()
    for (const fullkey of [...this._cache.keys()]) {
      if (isOptionKey(fullkey)) {
        const key = this._ensureCompilerOptionKey(fullkey, false)
        if (!key) {
          changed = true
          continue
        }
        if (!existsKeys.has(key)) {
          const newKey = `compilerOption.${preset}.${key}` as TOptionKey
          const fromKey = `compilerOption.${inheritFrom}.${key}` as TOptionKey
          existsKeys.set(key, [newKey, fromKey])
        }
      }
    }

    for (const [newKey, fromKey] of existsKeys.values()) {
      const value = this._cache.get(fromKey)
      if (value) {
        this._setValue(newKey, value)
        changed = true
      }
    }

    if (changed) {
      this._save()
    }
    this.changePreset(preset)
  }

  removePreset (preset: string, usePreset: null | string): void {
    const prefix = `compilerOption.${preset}.`
    let changed = false
    for (const fullkey of [...this._cache.keys()]) {
      if (fullkey.startsWith(prefix)) {
        this._removeValue(fullkey)
        changed = true
      }
    }

    if (changed) {
      this._save()
    }
    if (this._preset === preset || usePreset) {
      this.changePreset(usePreset ?? preset)
    }
  }

  cleanupPresets (existing: string[]): void {
    let changed = false
    let current = false
    for (const fullkey of [...this._cache.keys()]) {
      if (!isOptionKey(fullkey)) {
        continue
      }
      const preset = this._ensureCompilerOptionPreset(fullkey, false)
      if (!preset) {
        changed = true
        continue
      }
      if (existing.includes(preset)) {
        continue
      }
      this._removeValue(fullkey)
      changed = true
      if (this._preset === preset) {
        current = true
      }
    }

    if (changed) {
      this._save()
    }
    if (current || existing.length === 0) {
      this.changePreset(this._preset)
    }
  }

  on (listener: TStorageListener): void {
    this._emitter.on(listener)
  }

  off (listener: TStorageListener): void {
    this._emitter.off(listener)
  }

  save (): void | Promise<void> {
    return this._writeChanges()
  }

  toJsonText (): string {
    const records = {} as Record<string, any>
    for (const [key, value] of this._cache) {
      records[key] = value
    }
    return JSON.stringify(records, null, 2) + '\n'
  }

  async fromJson (json: Record<string, any>): Promise<void> {
    const release = await this._lock.acquire()
    try {
      const assert = (value: any): Record<string, any> => {
        if (isPlainObject(value)) {
          return value
        }
        this._logFn(`The uploaded JSON must be a valid object, for example: ${tags.code('{ "root.settings": {...}, "compilerOption.default.module": {...}, ...}')}.`)
        throw null
      }
      assert(json)
      const records = Object.entries(json).map(([k, v]) => [k, assert(v)] as const)

      const updated: Map<string, 'updated' | 'removed'> = new Map()
      for (const key of this._cache.keys()) {
        updated.set(key, 'removed')
      }
      const updatedItems: Map<string, [_CachedStorageItemBase<any>, 'updated' | 'removed']> = new Map()
      for (const [key, item] of this._items) {
        item._clearVerifiedKeys()
        updatedItems.set(key, [item, 'removed'])
      }

      this._cache.clear()
      this._pending.clear()

      const ignoredKeys = []
      for (const [fullkey, value] of records) {
        if (isOptionKey(fullkey)) {
          const path = fullkey.split('.') as [string, string, string]
          if (path.length === 3 && path.every((v) => v.length > 0)) {
            const item = updatedItems.get(path[2])
            if (item) {
              item[1] = 'updated'
            }
          }
          else {
            ignoredKeys.push(fullkey)
            continue
          }
        }
        else if (!fullkey.includes('.')) {
          ignoredKeys.push(fullkey)
          continue
        }
        else {
          const item = updatedItems.get(fullkey)
          if (item) {
            item[1] = 'updated'
          }
        }

        updated.set(fullkey, 'updated')
        this._cache.set(fullkey, value)
        this._pending.set(fullkey, value)
      }

      if (ignoredKeys.length > 0) {
        this._logFn(`Invalid keys were found (and ignored) in the uploaded JSON ${ignoredKeys.map((k) => tags.code(k)).join(', ')}.`)
      }

      await this._storage.clear()
      await this._writeChanges(release)

      for (const [key, type] of updated) {
        this._emitter._emit({ key, type })
      }
      for (const [item, type] of updatedItems.values()) {
        item._emit(type)
      }
    }
    catch { }
    finally {
      release()
    }
  }
}

const STORAGE_KEYS = Object.freeze({
  settings: 'root.settings',
  presets: 'root.presets'
} as const)

export {
  type TItemValidator,
  type TItemFactory,
  type TStorageEvent,
  type TStorageListener,
  CachedStorageItem,
  CachedStorage,
  NsCachedStorage,
  NsCachedStorageImpl,
  STORAGE_KEYS
}
