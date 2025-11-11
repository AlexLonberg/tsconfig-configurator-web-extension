import { AsyncLock } from './core.ts'
import { stub, tags } from './tags.ts'

/**
 * Категории исключенные из Compiler Options, но для которых нужно найти родительские элементы, для изменения стилей
 * макета, после перестроения страницы.
 */
const _otherCategory = {
  Top_Level: {
    title: 'Top Level',
    id: 'quick-nav-Top Level'
  },
  Command_Line: {
    title: 'Command Line',
    id: 'quick-nav-Command_line_Options_6171'
  },
  watchOptions: {
    title: 'watchOptions',
    id: 'quick-nav-watchOptions'
  },
  typeAcquisition: {
    title: 'typeAcquisition',
    id: 'quick-nav-typeAcquisition'
  }
} as const

/**
 * Целевые категории Compiler Options. Исходя их наблюдений, идентификаторы сайта константны и не меняются.
 */
const _categoryMap = {
  Type_Checking: {
    title: 'Type Checking',
    id: 'quick-nav-Type_Checking_6248'
  },
  Modules: {
    title: 'Modules',
    id: 'quick-nav-Modules_6244'
  },
  Emit: {
    title: 'Emit',
    id: 'quick-nav-Emit_6246'
  },
  JavaScript_Support: {
    title: 'JavaScript Support',
    id: 'quick-nav-JavaScript_Support_6247'
  },
  Editor_Support: {
    title: 'Editor Support',
    id: 'quick-nav-Editor_Support_6249'
  },
  Interop_Constraints: {
    title: 'Interop Constraints',
    id: 'quick-nav-Interop_Constraints_6252'
  },
  Backwards_Compatibility: {
    title: 'Backwards Compatibility',
    id: 'quick-nav-Backwards_Compatibility_6253'
  },
  Language_and_Environment: {
    title: 'Language and Environment',
    id: 'quick-nav-Language_and_Environment_6254'
  },
  Compiler_Diagnostics: {
    title: 'Compiler Diagnostics',
    id: 'quick-nav-Compiler_Diagnostics_6251'
  },
  Projects: {
    title: 'Projects',
    id: 'quick-nav-Projects_6255'
  },
  Output_Formatting: {
    title: 'Output Formatting',
    id: 'quick-nav-Output_Formatting_6256'
  },
  Completeness: {
    title: 'Completeness',
    id: 'quick-nav-Completeness_6257'
  },
  // NOTE Здесь на странице справки пусто
  // Command_Line: {
  //   title: 'Command Line',
  //   id: 'quick-nav-Command_line_Options_6171'
  // },
  Watch_Options: {
    title: 'Watch Options',
    id: 'quick-nav-Watch_and_Build_Modes_6250'
  },
} as const

type TCategoryKey = keyof typeof _categoryMap
const CATEGORY_KEYS: TCategoryKey[] = Object.keys(_categoryMap) as TCategoryKey[]
type TLocationHash = `#${string}`
type TTargetLink = {
  readonly isNav: boolean
  readonly hash: TLocationHash
  readonly name: string
  readonly link: HTMLAnchorElement
  readonly target: HTMLElement
}
type TCategoryOptions = { readonly title: string, readonly options: TTargetLink[] }
type TCategories = { readonly [_ in TCategoryKey]: TCategoryOptions }
type TLink2Target = ReadonlyMap<HTMLAnchorElement, TTargetLink>
type TParsedResult = {
  link2target: TLink2Target
  categories: TCategories
  section: HTMLDivElement[]
  errors: string[]
}

function _stubParsedResult (): TCategories {
  // @ts-expect-error
  return Object.fromEntries(Object.entries(_categoryMap).map(([key, { title }]) => [key, { title, options: [] }]))
}

/**
 * Обнаруживает блок навигации и блок описаний.
 */
function findContents (): {
  navigation?: undefined | null | HTMLDivElement,
  description?: undefined | null | HTMLDivElement,
  sticky?: undefined | null | HTMLElement
} {
  const navigation = document.querySelector('#gatsby-focus-wrapper > div > main div.tsconfig-quick-nav')?.parentElement as HTMLDivElement
  const next = navigation?.nextElementSibling
  let description: null | HTMLDivElement = null
  if (next?.nodeName === 'DIV' && next.querySelector('[id="Top Level"]')) {
    description = next as HTMLDivElement
  }

  const sticky = description?.querySelector('#sticky') as HTMLElement
  return {
    navigation,
    description,
    sticky
  }
}

function parseCategory (categoryName: string, id: string): { parent: HTMLDivElement, links: HTMLAnchorElement[], error?: never } | { links?: never, parent?: never, error: string } {
  const h = document.getElementById(id)
  if (!h) {
    return { error: `Failed to find the header for category "${categoryName}"(${tags.code(`id="${id}"`)}) which is expected to be adjacent to the options list.` }
  }
  const parent = h.parentElement! as HTMLDivElement
  const ol = parent.querySelector(`ol[aria-labelledby="${id}"]`)
  if (!ol) {
    return { error: `Options list not found for category "${categoryName}"(${tags.code(`id="${id}"`)}). Expected an element matching selector: ${tags.code(`ol[aria-labelledby="${id}"]`)}.` }
  }
  const links = [...ol.querySelectorAll('a[href^="#"]')] as HTMLAnchorElement[]
  return { parent, links }
}

/**
 * Сопоставления ссылок href с реальными id.
 * **Note:** На сайте ошибка - ссылки есть, но они некорветные.
 */
const _hrefMap: { readonly [_: TLocationHash]: TLocationHash } = {
  '#compilerOptions': '#compiler-options',
  '#watchOptions': '#watch-options',
  '#typeAcquisition': '#type-acquisition',
  '#disableFilenameBasedTypeAcquisition': '#type-disableFilenameBasedTypeAcquisition',
  '#excludeFiles': '#watch-excludeFiles'
}

/**
 * Поиск опций(ссылок навигации TS параметров) и связей между ссылками и панелью описаний.
 */
function parse (navigation: HTMLDivElement, description: HTMLDivElement): TParsedResult {
  const errors: string[] = []

  // Обнаруживаем все ссылки с хешем
  const navLinks: NodeListOf<HTMLAnchorElement> = navigation.querySelectorAll('a[href^="#"]')
  const desLinks: NodeListOf<HTMLAnchorElement> = description.querySelectorAll('a[href^="#"]')

  // Выделяем из description, ссылки у которых есть id - это цели навигации
  const id2target: Map<string, TTargetLink> = new Map()
  // Собираем сопоставления: link -> target - это поможет настроить плавную навигацию к целям
  const link2target: Map<HTMLAnchorElement, TTargetLink> = new Map()
  for (const a of desLinks) {
    const href = a.getAttribute('href') as TLocationHash
    const id = href.substring(1)
    const target = a.getAttribute('id') === id
      ? a
      : (
        // Некоторые ссылки указываю на заголовки
        document.getElementById(id) ?? (
          // битые ссылки сайта
          _hrefMap[href] ? document.getElementById(_hrefMap[href]) : null
        )
      )
    if (target) {
      const item = {
        isNav: false,
        hash: href,
        name: id,
        link: a,
        target
      }
      id2target.set(id, item)
      link2target.set(a, item)
      continue
    }
  }

  // Ищем сопоставления в панели навигации
  for (const a of navLinks) {
    const href = a.getAttribute('href') as TLocationHash
    const id = href.substring(1)
    const target = id2target.get(id)?.target ?? document.getElementById(id)
    if (target) {
      link2target.set(a, {
        isNav: true,
        hash: href,
        name: id,
        link: a,
        target
      })
      continue
    }
  }

  // Разбираем списки опций по категориям
  const section: HTMLDivElement[] = []
  const notFound: string[] = []
  const categories = {} as { [_ in TCategoryKey]: TCategoryOptions }
  for (const [key, { title, id }] of Object.entries(_categoryMap)) {
    const { links, parent, error } = parseCategory(title, id)
    if (links) {
      // Подбираем для каждого ключа целевую ссылку
      const options: TCategoryOptions['options'] = []
      for (const a of links) {
        let target = link2target.get(a)
        if (!target) {// исправляем на ссылку из панели навигации
          const hash = a.getAttribute('href') as TLocationHash
          const name = hash.substring(1)
          notFound.push(tags.code(name))
          target = { isNav: true, hash, name, link: a, target: stub.anchor }
        }
        options.push(target)
      }
      categories[key as TCategoryKey] = { title, options }
      section.push(parent)
    }
    else {
      categories[key as TCategoryKey] = { title, options: [] }
      if (errors.length > 0) {
        errors.push(tags.hr())
      }
      errors.push(error)
    }
  }
  if (notFound.length > 0) {
    if (errors.length > 0) {
      errors.push(tags.hr())
    }
    errors.push(`Targets in the description panel were not found for the links [${notFound.join(', ')}] in the navigation panel (Compiler Options).`)
  }

  // Добавляем блоки для изменения css
  for (const { id } of Object.values(_otherCategory)) {
    const h = document.getElementById(id)
    const parent = h?.parentElement
    if (parent) {
      section.push(parent as HTMLDivElement)
    }
  }

  return {
    errors,
    link2target,
    categories,
    section
  }
}

/**
 * Структура для восстановления позизии элемента на странице:
 *
 *  + `parent`  - Родительский элемент для `element`.
 *  + `point`   - Маркер-элемент(скрытый), который был установлен рядом(после `element`) для восстановления `element`.
 *  + `element` - Элемент страницы, позиция которого была изменена, например мы его вытащили и вставили в свой блок.
 */
type TPointElement = {
  readonly parent: HTMLElement,
  readonly point: HTMLElement,
  readonly element: HTMLElement
}

/**
 * Создает метку в `DOM`, для `element`, которая используется для восстановления.
 */
function createPoint (element: HTMLElement): TPointElement {
  const parent = element.parentElement!
  const point = document.createElement('span')
  point.style.display = 'none'
  point.style.width = '0'
  point.style.height = '0'
  const next = element.nextSibling
  if (next) {
    parent.insertBefore(point, next)
  }
  else {
    parent.appendChild(point)
  }
  return { parent, point, element }
}

type _TResources = {
  navigation: TPointElement
  description: TPointElement
  section: readonly HTMLElement[]
  sticky: TPointElement
  link2target: TLink2Target
  hash2target: ReadonlyMap<TLocationHash, HTMLElement>
  categories: TCategories
}

/**
 * Контейнер ресурсов страницы сайта.
 */
class Resources {
  private readonly _lock: AsyncLock
  private readonly _release: (() => any)
  readonly navigation: TPointElement
  readonly description: TPointElement
  readonly section: readonly HTMLElement[]
  readonly sticky: TPointElement
  readonly link2target: TLink2Target
  readonly hash2target: ReadonlyMap<TLocationHash, HTMLElement>
  readonly categories: TCategories

  protected constructor(rs: _TResources, lock: AsyncLock, release: (() => any)) {
    this.navigation = rs.navigation
    this.description = rs.description
    this.section = rs.section
    this.sticky = rs.sticky
    this.link2target = rs.link2target
    this.hash2target = rs.hash2target
    this.categories = rs.categories
    this._lock = lock
    this._release = release
  }

  async _acquire (): Promise<Resources> {
    const release = await this._lock.acquire()
    return new Resources(this, this._lock, release)
  }

  release (): void {
    this._release()
  }

  static create (): [boolean, Resources, string[]] {
    let fatal = false
    let errors: string[]
    const rs = {} as _TResources

    const { navigation, description, sticky } = findContents()
    if (navigation && description) {
      rs.navigation = createPoint(navigation)
      rs.description = createPoint(description)
      if (sticky) {
        rs.sticky = createPoint(sticky)
      }
      else {
        rs.sticky = { parent: stub.div, point: stub.div, element: stub.div }
      }
      const { link2target, categories, errors: _e, section } = parse(navigation, description)
      rs.section = section
      rs.link2target = link2target
      rs.categories = categories
      const hash2target = new Map()
      for (const { hash, target } of link2target.values()) {
        hash2target.set(hash, target)
      }
      rs.hash2target = hash2target
      errors = _e
    }
    else {
      fatal = true
      const p = { parent: stub.div, point: stub.div, element: stub.div }
      rs.navigation = p
      rs.description = p
      rs.sticky = p
      rs.section = []
      rs.link2target = new Map()
      rs.hash2target = new Map()
      rs.categories = _stubParsedResult()
      errors = [
        `The extension could not find the ${tags.code('Compiler Options')} navigation block or the description block.`,
        tags.hr(),
        'The website layout may have changed, and the extension might need an update 😏.'
      ]
    }

    return [fatal, new Resources(rs, new AsyncLock(), (() => null)), errors]
  }
}

export {
  type TCategoryKey,
  CATEGORY_KEYS,
  type TLocationHash,
  type TTargetLink,
  type TCategoryOptions,
  type TCategories,
  type TLink2Target,
  type TParsedResult,
  findContents,
  parse,
  type TPointElement,
  createPoint,
  Resources
}
