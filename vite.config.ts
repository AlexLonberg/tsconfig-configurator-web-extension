import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { type ConfigEnv, defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Нужно привести к правым слешам, пример: C:/.../src/
const src = join(dirname(fileURLToPath(import.meta.url)), 'src/').replace(/[\\/]+/g, '/')
// console.log('Base source path:', src)

// https://vitejs.dev/config/
export default defineConfig((env: ConfigEnv) => {
  const includeSourcemap = env.mode === 'development'
  const redefine = env.command === 'build'
    ? {
      // Перезапишем глобальную переменную process.env, которая собирается в режиме
      // библиотеки - удалит это !!(process.env.NODE_ENV !== "production")
      'process.env.NODE_ENV': '"production"'
    }
    : {}

  return {
    root: './typescriptlang',
    publicDir: './',
    plugins: [vue()],
    resolve: {
      alias: {
        '/src/': src
      }
    },
    css: {
      modules: {
        // Раскоментировать перед сборкой
        // generateScopedName: 'ts_ext_[local]_[hash:base64:5]'
        generateScopedName: '[local]_[hash:base64:5]'
      }
    },
    define: redefine,
    build: {
      sourcemap: includeSourcemap,
      minify: false,
      outDir: '../dist',
      emptyOutDir: true,
      cssMinify: false,
      copyPublicDir: false,
      lib: {
        entry: '../src/app.ts',
        // На выходе добавит расширение .js -> content.js
        fileName: 'content',
        formats: [
          // добавит в конец имени content.iife.js (утверждение "as" нужно чтобы TS не ругался на string)
          'iife' as 'iife',
          // Для расширения("world": "ISOLATED") нет смысла в iife, но сборщик vite переопределит глобальные переменные,
          // например addEventListener()(затрет window.addEventListener). Так что только iife спасет от конфликта.
          // 'es' as 'es'
        ],
        // требуется для 'iife', но непонятно зачем(в коде имя не видно)
        name: 'ts_config_extension',
      },
      target: 'esnext',
      rollupOptions: {
        output: {
          // Явно определим имя, чтобы не было *.iife.js
          entryFileNames: 'content.js',
          // У нас только один style.module.css
          assetFileNames: 'style.css'
        }
      }
    },
    server: {
      port: 5173, // по умолчанию. Этот же порт указываем в launch.json
      strictPort: true
    }
  }
})
