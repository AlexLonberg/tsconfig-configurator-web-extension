<script setup lang="ts">
import { onMounted, onUnmounted, shallowReactive } from 'vue'
import { css } from './tags.ts'
import { STORAGE_KEYS } from './storage.ts'
import type { Settings, TPageLayout, TTitleSize, TTitleWeight } from './settings.ts'
import Dialog from './Dialog.vue'
import Icon from './Icon.vue'

const props = defineProps<{
  settings: Settings
  close: (() => any)
}>()

const rProps = shallowReactive({ ...props.settings.record.get() })

function onSettings (e: { key: string }) {
  if (e.key === STORAGE_KEYS.settings) {
    const cur = props.settings.record.get()
    rProps.hideIgnoredOptions = cur.hideIgnoredOptions
    rProps.pageLayout = cur.pageLayout
    rProps.scrollBehaviorSmooth = cur.scrollBehaviorSmooth
    rProps.titleSize = cur.titleSize
    rProps.titleWeight = cur.titleWeight
  }
}

let lock = false
function onClick (e: Event) {
  if (lock) {
    return
  }

  try {
    const attr = (e.target as any).getAttribute('data-bs') as string
    if (attr) {
      const [key, value] = attr.split('_')
      if (key === 'storage') {
        if (value === 'save') {
          props.settings.download()
        }
        else if (value === 'clear') {
          props.settings.clear()
        }
        else if (value === 'load') {
          lock = true
          Promise.resolve(props.settings.upload()).finally(() => {
            lock = false
          })
        }
        return
      }

      if (key === 'pageLayout') {
        props.settings.setPageLayout(value as TPageLayout)
      }
      else if (key === 'scrollBehaviorSmooth') {
        props.settings.setScrollBehaviorSmooth(value === 'true')
      }
      else if (key === 'titleSize') {
        props.settings.setTitleSize(value as TTitleSize)
      }
      else if (key === 'titleWeight') {
        props.settings.setTitleWeight(value as TTitleWeight)
      }
    }
  } catch { }
}

onMounted(() => {
  props.settings.storage.on(onSettings)
})
onUnmounted(() => {
  props.settings.storage.off(onSettings)
})
</script>

<template>
  <Dialog icon="settings"
          title="Settings"
          :buttons="[{ key: '_', title: 'Close' }]"
          :close="() => props.close()">
    <div :class="$style.content"
         @click="onClick">
      <div :class="$style.option"
           style="grid-template-columns: auto auto auto 1fr;">
        <button data-bs="pageLayout_simple"
                :class="[css.notranslate, $style.btn, $style.btn_icon, { [$style.selected]: rProps.pageLayout === 'simple' }]">
          <Icon icon="view_cozy" />
        </button>
        <button data-bs="pageLayout_config"
                :class="[css.notranslate, $style.btn, $style.btn_icon, { [$style.selected]: rProps.pageLayout === 'config' }]">
          <Icon icon="construction" />
        </button>
        <button data-bs="pageLayout_off"
                :class="[css.notranslate, $style.btn, $style.btn_icon, { [$style.selected]: rProps.pageLayout === 'off' }]">Off</button>
        <div>Enable two-column layout by default.</div>
      </div>
      <div :class="$style.option"
           style="grid-template-columns: auto auto 1fr;">
        <button data-bs="scrollBehaviorSmooth_true"
                :class="[css.notranslate, $style.btn, { [$style.selected]: rProps.scrollBehaviorSmooth }]">On</button>
        <button data-bs="scrollBehaviorSmooth_false"
                :class="[css.notranslate, $style.btn, { [$style.selected]: !rProps.scrollBehaviorSmooth }]">Off</button>
        <div>Enable smooth scrolling for navigation.</div>
      </div>
      <div :class="$style.option"
           style="grid-template-columns: auto auto auto 1fr;">
        <button data-bs="titleSize_1em"
                :class="[css.notranslate, $style.btn, { [$style.selected]: rProps.titleSize === '1em' }]"
                style="font-size: 1em;">1em</button>
        <button data-bs="titleSize_1.2em"
                :class="[css.notranslate, $style.btn, { [$style.selected]: rProps.titleSize === '1.2em' }]"
                style="font-size: 1.2em;">1.2em</button>
        <button data-bs="titleSize_1.4em"
                :class="[css.notranslate, $style.btn, { [$style.selected]: rProps.titleSize === '1.4em' }]"
                style="font-size: 1.4em;">1.4em</button>
        <div>Option font size.</div>
      </div>
      <div :class="$style.option"
           style="grid-template-columns: auto auto 1fr;">
        <button data-bs="titleWeight_normal"
                :class="[css.notranslate, $style.btn, { [$style.selected]: rProps.titleWeight === 'normal' }]"
                style="font-size: 1.2em; font-weight: normal;">normal</button>
        <button data-bs="titleWeight_bold"
                :class="[css.notranslate, $style.btn, { [$style.selected]: rProps.titleWeight === 'bold' }]"
                style="font-size: 1.2em; font-weight: bold;">bold</button>
        <div>Option font weight.</div>
      </div>

      <div :class="$style.hr"></div>

      <div :class="[$style.option, $style.storage]">
        <button data-bs="storage_save"
                :class="[css.notranslate, css.btn]">Save to File</button>
        <button data-bs="storage_load"
                :class="[css.notranslate, css.btn]">Load from File</button>
        <button data-bs="storage_clear"
                :class="[css.notranslate, css.btn, $style.clear]">Clear all Data</button>
        <div style="grid-row: 1 / 4; grid-column: 2;">
          Saves all extension data to a file. This can be used for backup, restoration, or migration.
        </div>
      </div>
    </div>
  </Dialog>
</template>

<style module>
.content {
  display: flex;
  flex-direction: column;
  padding: 4px;
  gap: 8px;
}

.option {
  display: grid;
  align-items: center;
  padding: 4px;
  border-radius: 4px;
  gap: 8px;
}

.option:hover {
  background-color: var(--color-option-hover);
}

.btn {
  all: initial;
  box-sizing: border-box;
  appearance: none;
  display: block;
  height: auto;
  border: none;
  border-radius: 4px;
  margin: 0;
  padding: 0 8px;
  /* DOC color from var - background-color: color(from var(--color-btn-bg) srgb r g b / 0.2);
  https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/rgb
  https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color
  */
  background-color: rgb(from var(--color-btn-bg) r g b / 0.2);
  color: var(--color-btn-text);
  align-items: center;
  text-align: center;
  cursor: pointer;
  font-family: inherit;
  user-select: none;
}

.btn:not(.selected):hover {
  background-color: var(--color-btn-bg);
}

.btn.selected {
  background-color: var(--color-btn-bg);
  cursor: default;
}

.btn:not(:disabled, .selected):active {
  transform: translateY(1px);
}

.btn_icon>div {
  pointer-events: none;
  fill: var(--color-btn-text);
}

.hr {
  height: 4px;
  width: 48px;
  border-radius: 2px;
  background-color: var(--color-panel-bg);
  align-self: center;
  flex-shrink: 0;
}

.storage {
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto auto;
}

.clear:hover {
  --color-btn-hover: var(--color-error);
  --color-btn-text: #fff;
}
</style>
