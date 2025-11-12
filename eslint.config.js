import { defineConfig } from 'eslint/config'
import jsEslint from '@eslint/js'
import tsEslint from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'
import pluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'

const jsRules = jsEslint.configs.recommended.rules
const tsRules = tsEslint.configs.stylisticTypeChecked
  .reduce((a, item) => ((item.rules ? (a = { ...a, ...item.rules }) : a), a), {})

// DOC https://typescript-eslint.io/packages/typescript-eslint#advanced-usage
export default defineConfig({
  name: 'tsconfig-configurator-web-extension',
  files: [
    'src/**/*.{ts,vue}',
    'scripts/**/*.ts',
    'eslint.config.js',
    'vite.config.ts'
  ],
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parser: vueParser,
    parserOptions: {
      parser: tsEslint.parser,
      project: [
        'tsconfig.app.json',
        'tsconfig.project.json'
      ],
      extraFileExtensions: ['.vue']
    }
  },
  plugins: {
    '@typescript-eslint': tsEslint.plugin,
    '@stylistic': stylistic,
    vue: pluginVue
  },
  rules: {
    ...jsRules,
    ...tsRules,
    // Это правило `a === b` не установлено в jsEslint.configs.recommended и вероятно во всех плагинах.
    eqeqeq: [
      'error',
      'always'
    ],
    // Разрешаем пустые блоки только в catch (ex) {}
    'no-empty': ['error', { allowEmptyCatch: true }],
    // Правила для JS путают сигнатуры типов(например функций) с реальными, их следует отключить
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', {
      vars: 'all',
      varsIgnorePattern: '^_',
      args: 'all',
      argsIgnorePattern: '^_',
      caughtErrors: 'all',
      caughtErrorsIgnorePattern: '^_'
    }],
    // Не дает использовать type и предлагает явно interface
    '@typescript-eslint/consistent-type-definitions': 'off',
    // Требовать импорта типов как 'import {type Foo} from ...'
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'inline-type-imports' }],
    // Требует Record<A, B> или наоборот, вместо {[k: A]: B}
    '@typescript-eslint/consistent-indexed-object-style': 'off',
    // Не дает использовать в условных выражениях if( || )
    'prefer-nullish-coalescing': 'off',
    // Не дает явно объявить тип параметра `once: boolean = false`, считая что это лишнее.
    '@typescript-eslint/no-inferrable-types': 'off',
    // Требует вместо for/i использовать for/of.
    '@typescript-eslint/prefer-for-of': 'off',
    // Не дает использовать геттеры в литеральных свойствах классов вроде `get [Symbol.toStringTag] () { return 'Foo' }`
    '@typescript-eslint/class-literal-property-style': 'off',
    // Требует заменить `if(!value) value = ...` на `value ??= ...`, что не всегда очевидно - ignoreIfStatements
    // Не дает использовать в условных выражениях if( || ) - ignoreConditionalTests
    '@typescript-eslint/prefer-nullish-coalescing': ['error', {
      // allowRuleToRunWithoutStrictNullChecksIKnowWhatIAmDoing: true,
      // ignoreBooleanCoercion: true,
      // ignoreConditionalTests: true,
      // ignoreIfStatements: true,
      // ignoreMixedLogicalExpressions: true,
      // ignorePrimitives: true,
      ignoreTernaryTests: true,
    }],
    // По умолчанию(constructor) не дает определить аннотации слева(map: Map<> = new Map()),
    // но этого требует правило TS(--isolatedDeclarations)
    '@typescript-eslint/consistent-generic-constructors': ['error', 'type-annotation'],
    // Заставляет использовать ненулевое утверждение(!), вместо `as`, но ошибается в типах.
    '@typescript-eslint/non-nullable-type-assertion-style': 'off',
    // Разрешаем обращение к свойству через точку(foo.bar) или через строку(foo['bar'])
    '@typescript-eslint/dot-notation': 'off',
    // Не дает использовать сигнатуру интерфейса при определении типа функции
    '@typescript-eslint/prefer-function-type': 'off',
    // Для отключения предупреждений использования оператора debugger
    // 'no-debugger': 'off',
    //
    // ## Стиль ##
    //
    '@stylistic/quotes': ['error', 'single', { avoidEscape: true }]
  }
})
