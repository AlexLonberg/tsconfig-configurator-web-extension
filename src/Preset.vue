<script setup lang="ts">
import { shallowReactive } from 'vue'
import type {
  TPresetDialogCloseFn,
  TPresetDialogMode,
  TPresetDialogOptions,
  TPresetDialogResult
} from './presets.ts'
import { css } from './tags.ts'
import Dialog from './Dialog.vue'

const props = defineProps<{
  mode: TPresetDialogMode
  options: TPresetDialogOptions
  close: TPresetDialogCloseFn
}>()

const [icon, title, buttons] = props.mode === 'edit'
  ? ['edit', 'Edit Preset', [{ key: 'save', title: 'Save Changes' }, { key: 'remove', title: 'Delete Preset' }, { key: 'close', title: 'Close' }]] as const
  : ['add_2', 'New Preset', [{ key: 'save', title: 'Create Preset' }, { key: 'close', title: 'Close' }]] as const

const initText = {
  name: props.options.name ?? '',
  des: props.options.description ?? ''
}

const editors = {
  name: {
    get textContent () { return initText.name }
  },
  des: {
    get textContent () { return initText.des }
  }
}

const isAny = shallowReactive({ name: true, des: true })

let tId = undefined as any
function onInput (prop: 'name' | 'des', t?: true) {
  if (t) {
    isAny[prop] = !!editors[prop].textContent.trim()
  }
  else {
    isAny[prop] = true
    clearTimeout(tId)
    tId = setTimeout(onInput, 300, prop, true)
  }
}
onInput('name', true)
onInput('des', true)

function onClose (key: TPresetDialogResult) {
  props.close(key, {
    name: editors.name.textContent.trim(),
    description: editors.des.textContent.trim()
  })
}

const vMntName = {
  mounted (el: HTMLDivElement) {
    editors.name = el
  }
}

const vMntDes = {
  mounted (el: HTMLDivElement) {
    editors.des = el
  }
}
</script>

<template>
  <Dialog :icon="icon"
          :title="title"
          :buttons="buttons"
          :close="onClose">
    <div :class="[css.notranslate, $style.content]">
      <div :class="[$style.contenteditable, { [$style.nonempty]: isAny.name }]">
        <div :class="$style.placeholder">Preset name</div>
        <div :class="[$style.editor, $style.title]"
             contenteditable="plaintext-only"
             @input="() => onInput('name')"
             v-mnt-name>{{ initText.name }}</div>
      </div>
      <div :class="[$style.contenteditable, { [$style.nonempty]: isAny.des }]">
        <div :class="$style.placeholder">Description (optional)</div>
        <div :class="$style.editor"
             contenteditable="plaintext-only"
             @input="() => onInput('des')"
             v-mnt-des>{{ initText.des }}</div>
      </div>
    </div>

  </Dialog>
</template>

<style module>
.content {
  padding: 8px;
}

.title {
  font-size: 1.2em;
  font-weight: bold;
}

.contenteditable {
  padding: 4px 8px;
  text-align: center;
  border-radius: 4px;
  outline-offset: -1px;
  display: flex;
}

.contenteditable>.placeholder,
.contenteditable>.editor {
  outline: none;
  flex: 1 1 auto;
}

.contenteditable:focus-within {
  outline: var(--var-editor-outline);
}

.placeholder {
  pointer-events: none;
  position: absolute;
  user-select: none;
  opacity: 0.6;
  font-size: 1rem;
  font-weight: normal;
}

.contenteditable.nonempty>.placeholder,
.contenteditable:focus-within>.placeholder {
  opacity: 0;
}
</style>
