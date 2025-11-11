import { deepCopy } from './core.ts'
import { tags } from './tags.ts'

const OPTION_TYPES = Object.freeze(['boolean', 'number', 'string', 'array', 'enum', 'object'] as const)
const OPTION_STATUS = Object.freeze(['on', 'off', 'ignore'] as const)
type TOptionKind = (typeof OPTION_TYPES)[number]
type TOptionType = null | boolean | number | string
type TOptionStatus = (typeof OPTION_STATUS)[number]

type TOptionInfo = {
  kind: TOptionKind
  default: TOptionType | string[] // массивы могут быть только (null | string[])
  options: (null | boolean)[] | (null | string)[]
  comment?: undefined | null | string
  status?: TOptionStatus
}

type TOptionRecord = {
  kind: TOptionKind
  value: TOptionType | string[]
  comment: string
  status: TOptionStatus
}

const _DEFAULT = {
  'allowArbitraryExtensions': {
    'kind': 'boolean',
    'default': null,
    'options': [
      null,
      true,
      false
    ]
  },
  'allowImportingTsExtensions': {
    'kind': 'boolean',
    'default': null,
    'options': [
      null,
      true,
      false
    ]
  },
  'charset': {
    'kind': 'string',
    'default': null,
    'options': [
      null
    ]
  },
  'composite': {
    'kind': 'boolean',
    'default': true,
    'options': [
      null,
      true,
      false
    ]
  },
  'customConditions': {
    'kind': 'array',
    'default': [],
    'options': [
      null
    ]
  },
  'declaration': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'declarationDir': {
    'kind': 'string',
    'default': null,
    'options': [
      null
    ]
  },
  'diagnostics': {
    'kind': 'boolean',
    'default': null,
    'options': [
      null,
      true,
      false
    ]
  },
  'disableReferencedProjectLoad': {
    'kind': 'boolean',
    'default': null,
    'options': [
      null,
      true,
      false
    ]
  },
  'noPropertyAccessFromIndexSignature': {
    'kind': 'boolean',
    'default': null,
    'options': [
      null,
      true,
      false
    ]
  },
  'emitBOM': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'emitDeclarationOnly': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'erasableSyntaxOnly': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'exactOptionalPropertyTypes': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'incremental': {
    'kind': 'boolean',
    'default': null,
    'options': [
      null,
      true,
      false
    ]
  },
  'tsBuildInfoFile': {
    'kind': 'string',
    'default': '.tsbuildinfo',
    'options': [
      null
    ]
  },
  'inlineSourceMap': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'inlineSources': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'jsx': {
    'kind': 'enum',
    'default': 'preserve',
    'options': [
      'preserve',
      'react',
      'react-jsx',
      'react-jsxdev',
      'react-native'
    ],
    'comment': '@url'
  },
  'reactNamespace': {
    'kind': 'string',
    'default': 'React',
    'options': [
      null
    ]
  },
  'jsxFactory': {
    'kind': 'string',
    'default': 'React.createElement',
    'options': [
      null
    ]
  },
  'jsxFragmentFactory': {
    'kind': 'string',
    'default': 'React.Fragment',
    'options': [
      null
    ]
  },
  'jsxImportSource': {
    'kind': 'string',
    'default': 'react',
    'options': [
      null
    ]
  },
  'listFiles': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'mapRoot': {
    'kind': 'string',
    'default': null,
    'options': [
      null
    ]
  },
  'module': {
    'kind': 'enum',
    'default': 'nodenext',
    'options': [
      null,
      'commonjs',
      'amd',
      'system',
      'umd',
      'es6',
      'es2015',
      'es2020',
      'esnext',
      'none',
      'es2022',
      'node16',
      'node18',
      'node20',
      'nodenext',
      'preserve'
    ],
    'comment': '@url'
  },
  'moduleResolution': {
    'kind': 'enum',
    'default': 'nodenext',
    'options': [
      null,
      'classic',
      'node',
      'node10',
      'node16',
      'nodenext',
      'bundler'
    ],
    'comment': '@url'
  },
  'moduleSuffixes': {
    'kind': 'array',
    'default': [],
    'options': [
      null
    ]
  },
  'newLine': {
    'kind': 'enum',
    'default': 'lf',
    'options': [
      null,
      'crlf',
      'lf'
    ]
  },
  'noEmit': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'noEmitHelpers': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'noEmitOnError': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'noImplicitAny': {
    'kind': 'boolean',
    'default': null,
    'options': [
      null,
      true,
      false
    ]
  },
  'noImplicitThis': {
    'kind': 'boolean',
    'default': null,
    'options': [
      null,
      true,
      false
    ]
  },
  'noUnusedLocals': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'noUnusedParameters': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'noLib': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'noResolve': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'noStrictGenericChecks': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'out': {
    'kind': 'string',
    'default': null,
    'options': [
      null
    ]
  },
  'skipDefaultLibCheck': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'skipLibCheck': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'outFile': {
    'kind': 'string',
    'default': null,
    'options': [
      null
    ]
  },
  'outDir': {
    'kind': 'string',
    'default': null,
    'options': [
      null
    ]
  },
  'preserveConstEnums': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'preserveSymlinks': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'preserveValueImports': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'preserveWatchOutput': {
    'kind': 'boolean',
    'default': null,
    'options': [
      null,
      true,
      false
    ]
  },
  'pretty': {
    'kind': 'boolean',
    'default': true,
    'options': [
      null,
      true,
      false
    ]
  },
  'removeComments': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'rewriteRelativeImportExtensions': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'rootDir': {
    'kind': 'string',
    'default': null,
    'options': [
      null
    ]
  },
  'isolatedModules': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'sourceMap': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'sourceRoot': {
    'kind': 'string',
    'default': null,
    'options': [
      null
    ]
  },
  'suppressExcessPropertyErrors': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'suppressImplicitAnyIndexErrors': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'stripInternal': {
    'kind': 'boolean',
    'default': null,
    'options': [
      null,
      true,
      false
    ]
  },
  'target': {
    'kind': 'enum',
    'default': 'esnext',
    'options': [
      null,
      'es3',
      'es5',
      'es6',
      'es2015',
      'es2016',
      'es2017',
      'es2018',
      'es2019',
      'es2020',
      'es2021',
      'es2022',
      'es2023',
      'es2024',
      'esnext'
    ],
    'comment': '@url'
  },
  'useUnknownInCatchVariables': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'watch': {
    'kind': 'boolean',
    'default': null,
    'options': [
      null,
      true,
      false
    ]
  },
  'fallbackPolling': {
    'kind': 'enum',
    'default': 'dynamicPriorityPolling',
    'options': [
      'fixedPollingInterval',
      'priorityPollingInterval',
      'dynamicPriorityPolling',
      'fixedInterval',
      'priorityInterval',
      'dynamicPriority',
      'fixedChunkSize'
    ],
    'comment': 'In most cases, this parameter, which is used with the --watch parameter, is not needed. @url',
    'status': 'off'
  },
  'watchDirectory': {
    'kind': 'enum',
    'default': 'useFsEvents',
    'options': [
      'useFsEvents',
      'fixedPollingInterval',
      'dynamicPriorityPolling',
      'fixedChunkSizePolling'
    ]
  },
  'watchFile': {
    'kind': 'enum',
    'default': 'useFsEvents',
    'options': [
      'fixedPollingInterval',
      'priorityPollingInterval',
      'dynamicPriorityPolling',
      'useFsEvents',
      'useFsEventsOnParentDirectory',
      'fixedChunkSizePolling'
    ]
  },
  'experimentalDecorators': {
    'kind': 'boolean',
    'default': null,
    'options': [
      null,
      true,
      false
    ]
  },
  'emitDecoratorMetadata': {
    'kind': 'boolean',
    'default': null,
    'options': [
      null,
      true,
      false
    ]
  },
  'allowUnusedLabels': {
    'kind': 'boolean',
    'default': null,
    'options': [
      null,
      true,
      false
    ]
  },
  'noImplicitReturns': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'noUncheckedIndexedAccess': {
    'kind': 'boolean',
    'default': null,
    'options': [
      null,
      true,
      false
    ]
  },
  'noFallthroughCasesInSwitch': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'noImplicitOverride': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'allowUnreachableCode': {
    'kind': 'boolean',
    'default': null,
    'options': [
      null,
      true,
      false
    ]
  },
  'forceConsistentCasingInFileNames': {
    'kind': 'boolean',
    'default': true,
    'options': [
      null,
      true,
      false
    ]
  },
  'generateCpuProfile': {
    'kind': 'string',
    'default': 'profile.cpuprofile',
    'options': [
      null
    ]
  },
  'baseUrl': {
    'kind': 'string',
    'default': null,
    'options': [
      null
    ]
  },
  'paths': {
    'kind': 'object',
    'options': [
      null
    ],
    'default': null,
    'comment': 'Not supported by the configurator UI. @url',
    'status': 'off'
  },
  'plugins': {
    'kind': 'array',
    'options': [
      null
    ],
    'default': null,
    'comment': 'Not supported by the configurator UI. @url',
    'status': 'off'
  },
  'rootDirs': {
    'kind': 'array',
    'default': [],
    'options': [
      null
    ]
  },
  'typeRoots': {
    'kind': 'array',
    'default': [],
    'options': [
      null
    ]
  },
  'types': {
    'kind': 'array',
    'default': [],
    'options': [
      null
    ]
  },
  'traceResolution': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'allowJs': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'noErrorTruncation': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'allowSyntheticDefaultImports': {
    'kind': 'boolean',
    'default': null,
    'options': [
      null,
      true,
      false
    ]
  },
  'noImplicitUseStrict': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'listEmittedFiles': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'disableSizeLimit': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'lib': {
    'kind': 'array',
    'options': [
      'ES5',
      'ES6',
      'ES2015',
      'ES2015.Collection',
      'ES2015.Core',
      'ES2015.Generator',
      'ES2015.Iterable',
      'ES2015.Promise',
      'ES2015.Proxy',
      'ES2015.Reflect',
      'ES2015.Symbol.WellKnown',
      'ES2015.Symbol',
      'ES2016',
      'ES2016.Array.Include',
      'ES2017',
      'ES2017.Intl',
      'ES2017.Object',
      'ES2017.SharedMemory',
      'ES2017.String',
      'ES2017.TypedArrays',
      'ES2017.ArrayBuffer',
      'ES2018',
      'ES2018.AsyncGenerator',
      'ES2018.AsyncIterable',
      'ES2018.Intl',
      'ES2018.Promise',
      'ES2018.Regexp',
      'ES2019',
      'ES2019.Array',
      'ES2019.Intl',
      'ES2019.Object',
      'ES2019.String',
      'ES2019.Symbol',
      'ES2020',
      'ES2020.BigInt',
      'ES2020.Promise',
      'ES2020.String',
      'ES2020.Symbol.WellKnown',
      'ESNext',
      'ESNext.Array',
      'ESNext.AsyncIterable',
      'ESNext.BigInt',
      'ESNext.Collection',
      'ESNext.Intl',
      'ESNext.Iterator',
      'ESNext.Object',
      'ESNext.Promise',
      'ESNext.Regexp',
      'ESNext.String',
      'ESNext.Symbol',
      'DOM',
      'DOM.AsyncIterable',
      'DOM.Iterable',
      'ScriptHost',
      'WebWorker',
      'WebWorker.AsyncIterable',
      'WebWorker.ImportScripts',
      'Webworker.Iterable',
      'ES7',
      'ES2021',
      'ES2020.SharedMemory',
      'ES2020.Intl',
      'ES2020.Date',
      'ES2020.Number',
      'ES2021.Promise',
      'ES2021.String',
      'ES2021.WeakRef',
      'ESNext.WeakRef',
      'ES2021.Intl',
      'ES2022',
      'ES2022.Array',
      'ES2022.Error',
      'ES2022.Intl',
      'ES2022.Object',
      'ES2022.String',
      'ES2022.SharedMemory',
      'ES2022.RegExp',
      'ES2023',
      'ES2023.Array',
      'ES2024',
      'ES2024.ArrayBuffer',
      'ES2024.Collection',
      'ES2024.Object',
      'ES2024.Promise',
      'ES2024.Regexp',
      'ES2024.SharedMemory',
      'ES2024.String',
      'Decorators',
      'Decorators.Legacy',
      'ES2017.Date',
      'ES2023.Collection',
      'ESNext.Decorators',
      'ESNext.Disposable',
      'ESNext.Error',
      'ESNext.Sharedmemory'
    ],
    'default': [],
    'comment': '@url'
  },
  'libReplacement': {
    'kind': 'boolean',
    'default': true,
    'options': [
      null,
      true,
      false
    ]
  },
  'moduleDetection': {
    'kind': 'enum',
    'default': 'auto',
    'options': [
      'auto',
      'legacy',
      'force'
    ],
    'comment': '@url'
  },
  'strictNullChecks': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'maxNodeModuleJsDepth': {
    'kind': 'number',
    'options': [
      null
    ],
    'default': 0,
    'comment': '@url'
  },
  'importHelpers': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'importsNotUsedAsValues': {
    'kind': 'enum',
    'default': 'remove',
    'options': [
      'remove',
      'preserve',
      'error'
    ]
  },
  'alwaysStrict': {
    'kind': 'boolean',
    'default': null,
    'options': [
      null,
      true,
      false
    ]
  },
  'strict': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'strictBindCallApply': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'downlevelIteration': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'checkJs': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'strictFunctionTypes': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'strictPropertyInitialization': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'esModuleInterop': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'allowUmdGlobalAccess': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'keyofStringsOnly': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'useDefineForClassFields': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'declarationMap': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'resolveJsonModule': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'resolvePackageJsonExports': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'resolvePackageJsonImports': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'assumeChangesOnlyAffectDirectDependencies': {
    'kind': 'boolean',
    'default': null,
    'options': [
      null,
      true,
      false
    ]
  },
  'extendedDiagnostics': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'listFilesOnly': {
    'kind': 'boolean',
    'default': null,
    'options': [
      null,
      true,
      false
    ]
  },
  'disableSourceOfProjectReferenceRedirect': {
    'kind': 'boolean',
    'default': null,
    'options': [
      null,
      true,
      false
    ]
  },
  'disableSolutionSearching': {
    'kind': 'boolean',
    'default': null,
    'options': [
      null,
      true,
      false
    ]
  },
  'verbatimModuleSyntax': {
    'kind': 'boolean',
    'default': null,
    'options': [
      null,
      true,
      false
    ]
  },
  'noCheck': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'isolatedDeclarations': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'noUncheckedSideEffectImports': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'strictBuiltinIteratorReturn': {
    'kind': 'boolean',
    'default': false,
    'options': [
      null,
      true,
      false
    ]
  },
  'explainFiles': {
    'kind': 'boolean',
    'default': false,
    'options': [
      true,
      false
    ],
    'comment': 'Not in the JSON schema, but documented on the website @url',
    'status': 'ignore'
  },
  'generateTrace': {
    'kind': 'boolean',
    'default': false,
    'options': [
      true,
      false
    ],
    'comment': 'Not in the JSON schema, but documented on the website @url',
    'status': 'ignore'
  }
} as const

type TOptionsKey = keyof typeof _DEFAULT
const DEFAULT_COMPILER_OPTIONS: { [_ in TOptionsKey]: TOptionInfo } = _DEFAULT as unknown as { [_ in TOptionsKey]: TOptionInfo }

function defaultUnknownOption (): TOptionInfo {
  return {
    kind: 'string',
    default: null,
    options: [null],
    comment: 'Unknown parameter.',
    status: 'ignore'
  }
}

function defaultUnknownOptionRecord (): TOptionRecord {
  return {
    kind: 'string',
    value: null,
    comment: 'Unknown parameter.',
    status: 'ignore'
  }
}

function defaultOption (key: string): [TOptionInfo, null | string[]] {
  // @ts-expect-error
  const opts = DEFAULT_COMPILER_OPTIONS[key] as TOptionInfo
  if (opts) {
    return [deepCopy(opts), null]
  }
  return [defaultUnknownOption(), [`Failed to get compiler option ${tags.code(key)}.`, 'The website may have updated the Compiler Options list.']]
}

function defaultOptionRecord (key: string): [TOptionRecord, null | string[]] {
  // @ts-expect-error
  const opts = DEFAULT_COMPILER_OPTIONS[key] as TOptionInfo
  if (opts) {
    return [{
      kind: opts.kind,
      value: deepCopy(opts.default),
      comment: opts.comment ?? '@url',
      status: opts.status ?? 'on'
    }, null]
  }
  return [defaultUnknownOptionRecord(), [`Failed to get compiler option ${tags.code(key)}.`, 'The website may have updated the Compiler Options list.']]
}

type _TRes = ([any, null] | [null, string[]])
type _TFn = (key: TOptionsKey, raw: any, opt: TOptionInfo) => _TRes
const _V: { [K in Exclude<TOptionKind, 'object'>]: _TFn } = Object.freeze({
  boolean: (key: TOptionsKey, raw: any, _opt: TOptionInfo): _TRes => {
    const type = typeof raw
    return type === 'boolean' ? [raw, null] : [null, [`The value type for key ${tags.code(key)}, must be ${tags.code('boolean')}, but received ${tags.code(type)}.`]]
  },
  number: (key: TOptionsKey, raw: any, _opt: TOptionInfo): _TRes => {
    const type = typeof raw
    return type === 'number' && Number.isSafeInteger(raw) && raw >= 0 && raw <= 8
      ? [raw, null]
      : [null, [`The value type for key ${tags.code(key)}, must be ${tags.code('number(0-8)')}, but received ${tags.code(type)}.`]]
  },
  string: (key: TOptionsKey, raw: any, _opt: TOptionInfo): _TRes => {
    const type = typeof raw
    return type === 'string' ? [raw, null] : [null, [`The value type for key ${tags.code(key)}, must be ${tags.code('string')}, but received ${tags.code(type)}.`]]
  },
  enum: (key: TOptionsKey, raw: any, opt: TOptionInfo): _TRes => {
    const type = typeof raw
    return (type === 'string' && opt.options.some((v) => (typeof v === 'string' && v.toLowerCase() === raw.toLowerCase())))
      ? [raw, null]
      : [null, [`The value type for key ${tags.code(key)}, must be a valid ${tags.code('enum:string')}.`]]
  },
  array: (key: TOptionsKey, raw: any, _opt: TOptionInfo): _TRes => {
    return (Array.isArray(raw) && raw.every((v) => typeof v === 'string'))
      ? [raw, null]
      : [null, [`The value type for key ${tags.code(key)}, must be an array of strings ${tags.code('array:string')}.`]]
  }
})

function safeValidateOption (key: TOptionsKey, raw: TOptionRecord): [TOptionRecord, null | string[]] {
  let def!: (() => TOptionRecord)
  try {
    const [opt, errors_] = defaultOption(key)
    def = () => ({
      kind: opt.kind,
      value: opt.default,
      comment: opt.comment ?? 'Unknown parameter.',
      status: opt.status ?? 'ignore'
    })
    if (errors_) {
      return [def(), errors_]
    }

    const errors: string[] = []
    const fallback = (...message: string[]): [TOptionRecord, null | string[]] => {
      errors.push(...message)
      return [def(), errors]
    }

    const kind = raw.kind
    if (!OPTION_TYPES.includes(kind)) {
      return fallback(`Invalid ${tags.code('kind')} key for parameter ${tags.code(key)}.`)
    }
    if (opt.kind !== kind) {
      return fallback(`The type ${tags.code(`kind:${kind}`)} for key ${tags.code(key)} does not match the expected type ${tags.code(`kind:${opt.kind}`)}.`)
    }

    let status = raw.status
    if (!OPTION_STATUS.includes(status)) {
      errors.push(`Invalid ${tags.code('status')} key for parameter ${tags.code(key)}.`)
      status = 'ignore'
    }

    let comment = raw.comment
    if (typeof comment !== 'string') {
      comment = comment === null ? '@url' : ''
    }

    let value: any = raw.value
    const vType = typeof value
    if (value === null || vType === 'undefined') {
      // NOTE Явно приводим lib к ожидаемому массиву
      if (key === 'lib') {
        value = []
      }
      else if (!opt.options.includes(null)) {
        return fallback(`The parameter ${tags.code(key)} does not support null values.`)
      }
      else {
        value = null
      }
    }
    else if (key === 'plugins' && Array.isArray(value)) {
      // NOTE ... не проверяем - внутри объекты, не поддерживается
      value = null
    }
    else if (key === 'paths' && vType === 'object' && !Array.isArray(value)) {
      // NOTE ... не проверяем - это объект, не поддерживается
      value = null
    }
    else if (kind === 'object') {
      throw null // этого не случится - единственный параметр paths и он выше
    }
    else {
      const [v, e] = _V[kind](key, value, opt)
      if (e) {
        return fallback(...e)
      }
      value = v
    }

    return [{ kind, value, comment, status }, null]

  } catch { }

  return [def?.() ?? defaultOptionRecord(key)[0], [`Failed to validate the parameter ${tags.code(key)}.`]]
}

function copyOptionRecord (option: TOptionRecord): TOptionRecord {
  return {
    kind: option.kind,
    value: deepCopy(option.value),
    comment: option.comment,
    status: option.status
  }
}

export {
  type TOptionKind,
  type TOptionType,
  type TOptionStatus,
  type TOptionInfo,
  type TOptionRecord,
  type TOptionsKey,
  DEFAULT_COMPILER_OPTIONS,
  defaultUnknownOption,
  defaultUnknownOptionRecord,
  defaultOption,
  defaultOptionRecord,
  safeValidateOption,
  copyOptionRecord
}
