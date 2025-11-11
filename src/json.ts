import type { TOptionType } from './options.ts'

const baseUrl = 'https://www.typescriptlang.org/tsconfig/'

class Builder {
  private _options: string[] = ['{', '  "compilerOptions": {']

  addTitle (title: string): void {
    this._options.push('    //', `    // ## ${title}`, '    //')
  }

  add (comment: null | string, status: 'on' | 'off', name: string, value: TOptionType | (readonly TOptionType[])) {
    if (comment) {
      const rows = comment.split('\n')
      for (const item of rows) {
        const row = item.replace(/(?<=^|\s)(@url)(?=\s|$)/ig, `${baseUrl}#${name}`)
        this._options.push(`    // ${row}`)
      }
    }
    const pre = status === 'off' ? '// ' : ''
    const val = typeof value === 'undefined' ? 'null' : JSON.stringify(value)
    this._options.push(`    ${pre}"${name}": ${val},`)
  }

  toJson (): string {
    this._options.push(
      '  },',
      '  "typeAcquisition": {',
      '    "disableFilenameBasedTypeAcquisition": true',
      '  },',
      '  "include": [],',
      '  "files": [],',
      '  "exclude": [],',
      '  "references": null',
      '}',
      '')
    return this._options.join('\n')
  }
}

function textDownload (text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}

function uploadJson (): Promise<Record<string, any>> {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  return new Promise<Record<string, any>>((ok, fail) => {
    input.addEventListener('change', async (event: any) => {
      let result: any = null
      try {
        const file = event.target.files?.[0]
        const text = await file.text()
        const raw = JSON.parse(text)
        if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
          result = raw
        }
      } catch { }
      if (result) {
        ok(result)
      }
      else {
        fail()
      }
    })
    input.addEventListener('abort', () => {
      // debugger
      fail()
    })
    input.addEventListener('focusout', () => {
      // debugger
      fail()
    })
    input.addEventListener('blur', () => {
      // debugger
      fail()
    })
    input.addEventListener('cancel', () => {
      // При отказе по крестику(диалогового окна) или кнопке, срабатывает только здесь
      // debugger
      fail()
    })
    input.click()
  })
}

export {
  Builder,
  textDownload,
  uploadJson
}
