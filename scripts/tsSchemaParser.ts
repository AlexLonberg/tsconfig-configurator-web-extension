import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync, writeFileSync } from 'node:fs'
import { options as options_ } from './compilerOptions.ts'

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))
const outDir = join(rootDir, '.temp')
const tsOptions = join(outDir, 'ts.options.json')
const tsDefault = join(outDir, 'ts.default.json')
const tsConfig = join(outDir, 'tsconfig.json')
const tsError = join(outDir, 'ts.error.json')

mkdirSync(outDir, { recursive: true })

const errors: any[] = []
const print = (key: string) => {
  errors.push([key, (options_ as any)[key]])
}

type TOptionStatus = 'on' | 'off' | 'ignore'
type TOptionKind = 'boolean' | 'number' | 'string' | 'array' | 'enum' | 'object'
type TOptionType = undefined | null | boolean | string
type TOptionInfo = {
  kind: TOptionKind
  default: TOptionType | TOptionType[] | {}
  options: TOptionType[]
  comment?: undefined | null | string
  status?: TOptionStatus
}

const COMPILER_OPTIONS = {} as Record<string, any>
const DEFAULT = {} as Record<string, TOptionInfo>

for (const [key, raw] of Object.entries(options_) as [string, any]) {
  COMPILER_OPTIONS[key] = { ...raw, description: undefined, markdownDescription: undefined }

  // Сразу пропускаем спец-опции, которые не установить в конфигураторе или имеющие редкую структуру.
  // Можно позволить устанавливать как JSON-строку и проверять ее при печати.
  if (key === 'paths') {
    DEFAULT[key] = {
      kind: 'object', // Единственный параметр объект.
      options: [null],
      default: null,
      comment: 'Not supported by the configurator UI. @url',
      status: 'off'
    }
    continue
  }
  if (key === 'plugins') {
    DEFAULT[key] = {
      kind: 'array',
      options: [null],
      default: null,
      comment: 'Not supported by the configurator UI. @url',
      status: 'off'
    }
    continue
  }
  if (key === 'lib') {
    // debugger
    DEFAULT[key] = {
      kind: 'array',
      options: raw.items.anyOf[0].enum,
      default: [],
      comment: '@url'
    }
    continue
  }
  if (key === 'maxNodeModuleJsDepth') {
    DEFAULT[key] = {
      kind: 'number',
      options: [null],
      default: 0,
      comment: '@url'
    }
    continue
  }

  const info = {
    kind: 'TODO',
    default: 'TODO',
    options: []
  } as unknown as TOptionInfo

  const tp = Object.hasOwn(raw, 'type') ? [true, raw.type] : [false, null]
  const df = Object.hasOwn(raw, 'default') ? [true, raw.default] : [false, null]
  const en = Object.hasOwn(raw, 'enum') ? [true, raw.enum] : [false, null]
  const an = Object.hasOwn(raw, 'anyOf') ? [true, raw.anyOf] : [false, null]

  if (tp[0]) {
    if (Array.isArray(tp[1]) && tp[1].length === 2) {
      const [i1, i2] = tp[1]
      if (i2 === 'null') {
        info.options.push(null)
      }
      if (i1 === 'boolean') {
        info.kind = 'boolean'
        info.options.push(true, false)
      }
      else if (i1 === 'number') {
        info.kind = 'number'
      }
      else if (i1 === 'string') {
        info.kind = 'string'
      }
      else if (i1 === 'array') {
        if (raw.items.type === 'string') {
          info.kind = 'array'
          info.default = []
        }
        else {
          print(key)
        }
      }
      else {
        print(key)
      }
    }
    else {
      print(key)
    }
  }

  if (df[0]) {
    const value = df[1]
    // Для некоторых enum, тип не установлен, и его проверку надо избежать.
    if (key === 'watchDirectory' || key === 'watchFile' || key === 'importsNotUsedAsValues' || typeof value === info.kind) {
      info.default = value
    }
    else {
      print(key)
    }
  }

  if (en[0]) {
    if (Array.isArray(en[1])) {
      if (info.kind && info.kind !== 'TODO' as any) {
        print(key)
      }
      else {
        info.kind = 'enum'
        info.options.push(...en[1])
      }
    }
    else {
      print(key)
    }
  }

  if (an[0]) {
    // debugger // 'module' 'moduleResolution' 'newLine' 'target'
    // Переделываем в 'enum'
    if (info.kind === 'string') {
      if (Array.isArray(an[1][0].enum)) {
        info.kind = 'enum'
        info.options.push(...an[1][0].enum)
      }
      else {
        print(key)
      }
    }
    else {
      print(key)
    }
  }

  // Для значений у которых нет умолчания, первым элементом должен быть null
  if (info.default === 'TODO') {
    // Исключения, у которых нет умолчания
    if (key === 'jsx' && info.kind === 'enum') {
      info.default = 'preserve'
      info.comment = '@url'
    }
    else if (key === 'fallbackPolling' && info.kind === 'enum') {
      info.default = 'dynamicPriorityPolling'
      info.comment = 'In most cases, this parameter, which is used with the --watch parameter, is not needed. @url'
      info.status = 'off'
    }
    else if (key === 'moduleDetection' && info.kind === 'enum') {
      info.default = 'auto' // По умолчанию "auto"
      info.comment = '@url'
    }
    else if (info.options[0] === null) {
      info.default = null
    }
    else {
      print(key)
    }
  }

  // Правим некоторые типы
  if (key === 'target') {
    info.default = 'esnext'
    info.comment = '@url'
  }
  else if (key === 'module') {
    info.default = 'nodenext'
    info.comment = '@url'
  }
  else if (key === 'moduleResolution') {
    info.default = 'nodenext'
    info.comment = '@url'
  }

  DEFAULT[key] = info
}

// Этих опций нет в JSON, но есть на сайте
if (!Object.hasOwn(DEFAULT, 'explainFiles')) {
  DEFAULT['explainFiles'] = {
    kind: 'boolean',
    default: false,
    options: [true, false],
    comment: 'Not in the JSON schema, but documented on the website @url',
    status: 'ignore'
  }
}
if (!Object.hasOwn(DEFAULT, 'generateTrace')) {
  DEFAULT['generateTrace'] = {
    kind: 'boolean',
    default: false,
    options: [true, false],
    comment: 'Not in the JSON schema, but documented on the website @url',
    status: 'ignore'
  }
}

writeFileSync(tsOptions, JSON.stringify(COMPILER_OPTIONS, null, 2), 'utf8')

if (errors.length > 0) {
  writeFileSync(tsError, JSON.stringify(Object.fromEntries(errors), null, 2), 'utf8')
}
else {
  writeFileSync(tsDefault, JSON.stringify(DEFAULT, null, 2), 'utf8')
  // Дополнительно печатаем файл - редактор подсветит ошибки
  const cfg = {
    compilerOptions: {} as any,
    exclude: ['./tsSchemaParser.ts']
  }
  for (const [key, value] of Object.entries(DEFAULT)) {
    cfg.compilerOptions[key] = value.default
  }
  writeFileSync(tsConfig, JSON.stringify(cfg, null, 2), 'utf8')
}
