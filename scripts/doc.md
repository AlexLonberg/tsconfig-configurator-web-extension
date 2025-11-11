
# В этом каталоге:

* `tsconfig.schema.json` - Схема(скачано 30.10.2025) https://www.schemastore.org/tsconfig.json. 
* `compilerOptions.ts` - Копия целевой ветки с параметрами `tsconfig.schema.json -> compilerOptionsDefinition.properties.compilerOptions.properties`.
* `tsSchemaParser.ts` - Разбирает файл схемы(ветку) в параметры по умолчанию.

Результат(в _".temp/*"_):

    node ./scripts/tsSchemaParser.ts

* `ts.default.json` - Результат скрипта `tsSchemaParser.ts` используемый в `src/options.ts`.
* `ts.error.json` - Вспомогательный файл, если что-то пропустили в логике парсера и требуется доработка.
* `tsconfig.json` - То что получилось с опциями по умолчанию, для просмотра в редакторе.

## Типы TSConfig compilerOptions:

* Тип `number`, только у `maxNodeModuleJsDepth`.
* Все массивы (_kind:array_) и перечисления(_kind:enum_) имеют тип `string`.
* Параметр `lib:array` имеет предопределенный набор возможных значений.
* Остальные типы это либо `boolean`, либо строка(в основном для путей).

Опции, которые есть на странице сайта, но нет в JSON:

* `explainFiles`  - Судя по справке это `boolean`.
* `generateTrace` - Судя по справке это `boolean`.

Два параметра(`paths` и `plugins`) имеют сложные типы - вложенные объекты:

```json
  "paths": {
    "type": [
      "object", // проверяем только тип объекта(не массива) или допустимый null
      "null"
    ],
    "additionalProperties": {
      "type": [
        "array",
        "null"
      ],
      "uniqueItems": true,
      "items": {
        "type": "string"
      }
    }
  },
  "plugins": {
    "type": [
      "array", // проверяем только тип массива или допустимый null
      "null"
    ],
    "items": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string"
        }
      }
    }
  },
```

... такие опции не будут поддерживаться конфигуратором, ... да и незачем.
