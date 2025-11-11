import { argv } from 'node:process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readdirSync, copyFileSync } from 'node:fs'

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))
const assetsDir = join(rootDir, 'assets')
const outDir = join(rootDir, 'dist')

const isDev = argv.includes('--dev')
const fileNames = readdirSync(assetsDir, 'utf8')

for (const name of fileNames) {
  if (name === 'manifest.json' || name === 'manifest.dev.json') {
    continue
  }
  const src = join(assetsDir, name)
  const dest = join(outDir, name)
  copyFileSync(src, dest)
}

const src = join(assetsDir, isDev ? 'manifest.dev.json' : 'manifest.json')
copyFileSync(src, join(outDir, 'manifest.json'))
