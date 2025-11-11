import { createApp } from 'vue'
import { css } from './tags.ts'
import { Environment } from './environment.ts'
import App from './App.vue'

/**
 * Без принудительной задержки, страница сайта выкинет две ошибки:
 *
 *  Error: Minified React error #418 Hydration failed because the initial UI does not match what was rendered on the server.
 *  Error: Minified React error #423 Text content does not match. Server: ... Client: ...
 */
async function documentReady (): Promise<string> {
  const start = performance.now()
  let code: 'timeout' | 'mutation' | 'loaded' = 'loaded'
  let resolve!: (() => any)
  let pending = true
  let id = undefined as any
  let observer: null | MutationObserver = null
  const whenReady: Promise<string> = new Promise((r) => {
    resolve = () => {
      if (pending) {
        pending = false
        observer?.disconnect()
        const timeInSeconds = (performance.now() - start) / 1000
        r(`${timeInSeconds.toFixed(3)} sec (${code})`)
      }
    }
  })
  const on = () => {
    if (pending && !observer) {
      observer = new MutationObserver((..._: any[]) => {
        code = 'mutation'
        clearTimeout(id)
        // Минимальное время проверки между изменениями
        id = setTimeout(resolve, 300)
      })
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      })
      // Максимальное время ожидания изменений.
      id = setTimeout(resolve, 500)
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', on, { once: true })
  }
  else {
    // Минимальная задержка при запуске
    setTimeout(on, 100)
  }
  // Максимальное время загрузки.
  // Это не сработает - выше уже есть максимальное время(500), но пусть останется на случай изменения логики.
  // setTimeout(() => {
  //   code = 'timeout'
  //   resolve()
  // }, 3000)
  return whenReady
}

void async function () {
  const time = await documentReady()
  console.log(`🎉 Hi! Extension: TSConfig Configurator (typescriptlang.org). Loading time: ${time}.`)

  const host = document.createElement('div')
  host.className = css.css_host
  host.style.display = 'contents'
  host.style.position = 'fixed'
  host.style.left = '0'
  host.style.top = '0'
  host.style.width = '0'
  host.style.height = '0'
  host.style.overflow = 'visible'
  host.style.zIndex = '999999'
  document.body.appendChild(host)

  const env = new Environment(500)
  const vueApp = createApp(App, {
    control: env.control,
    rProps: env.rProps,
    rFloats: env.rFloats
  })
  vueApp.mount(host)

  env.addCleanFn(() => vueApp.unmount(), () => host.remove())
  env.init()

  window.addEventListener('beforeunload', () => env.storage.save())
}()
