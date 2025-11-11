<script setup lang="ts">
import { onMounted, onUnmounted, shallowReactive, watch } from 'vue'
import type { CfgProperty } from './config.ts'
import type { TOptionStatus } from './options.ts'
import { STORAGE_KEYS } from './storage.ts'
import { textEditorStub } from './core.ts'
import { getIcon } from './icons.ts'
import Icon from './Icon.vue'

const props = defineProps<{
  property: CfgProperty
}>()

const cfgProp = props.property
const settings = cfgProp.settings
const storage = cfgProp.storage
const config = cfgProp.root
const rProps = cfgProp.rProps
const rItems = cfgProp.rItems

// Определяем тип редактора
const EDITOR_TYPE = {
  array: false,  // показать скобки
  string: false, // встроить текстовый редактор
  enum: false    // показать селектор
  // unsupported: false, // вместо значения вставить null
}
if (cfgProp.kind === 'array') {
  EDITOR_TYPE.array = true
}
if (cfgProp.kind === 'string' || (cfgProp.kind === 'array' && cfgProp.name !== 'lib' && cfgProp.name !== 'plugins')) {
  EDITOR_TYPE.string = true
}
else if (
  cfgProp.kind === 'boolean' || cfgProp.kind === 'enum' ||
  cfgProp.name === 'lib' || cfgProp.name === 'maxNodeModuleJsDepth'
) {
  EDITOR_TYPE.enum = true
}

const reactProps = shallowReactive({
  showSelector: false,
  titleSize: settings.titleSize,
  titleWeight: settings.titleWeight
})

function onSettings (e: { key: string }) {
  if (e.key === STORAGE_KEYS.settings) {
    reactProps.titleSize = settings.titleSize
    reactProps.titleWeight = settings.titleWeight
  }
}

let editor = textEditorStub(rProps.value)
function onInput () {
  cfgProp.changeString(editor.textContent)
}
const vValueEditor = {
  mounted (el: HTMLDivElement) {
    editor = el
    editor.textContent = rProps.value
    editor.addEventListener('input', onInput)
  },
  unmounted () {
    editor.removeEventListener('input', onInput)
    editor = textEditorStub()
  }
}

let comment = textEditorStub(cfgProp.getCurrentComment())
function onComment () {
  cfgProp.changeComment(comment.textContent)
}
const vCommentEditor = {
  mounted (el: HTMLDivElement) {
    comment = el
    comment.textContent = cfgProp.getCurrentComment()
    comment.addEventListener('input', onComment)
    cfgProp.setElement(el)
  },
  unmounted () {
    comment.removeEventListener('input', onComment)
    comment = textEditorStub()
    cfgProp.setElement(null)
  }
}
watch(() => rProps.onLoaded, () => {
  editor.textContent = rProps.value
  comment.textContent = cfgProp.getCurrentComment()
})

const statusIcon = {
  on: getIcon('check_small'),
  off: document.createTextNode('//'),
  ignore: getIcon('check_indeterminate_small'),
  el: { textContent: '', appendChild (_: any) { /**/ } } as unknown as HTMLDivElement,
  change (status: TOptionStatus) {
    statusIcon.el.textContent = ''
    statusIcon.el.appendChild(statusIcon[status])
  }
}
watch(() => rProps.status, (status: TOptionStatus) => {
  statusIcon.change(status)
})
const vIcon = {
  mounted (el: HTMLDivElement) {
    statusIcon.el = el
    statusIcon.change(rProps.status)
  }
}

const callbackToken = () => reactProps.showSelector = false

function showSelector (e: Event) {
  e.stopPropagation()
  config.globalClickEmit(callbackToken)
  reactProps.showSelector = true
}

// Выбор предопределенных параметров(*:enum & lib:[])
function pickItem (e: Event, key: string) {
  if (cfgProp.kind === 'array') {
    e.stopPropagation() // у lib может быть несколько парметров одновременно - останавливаем клик
  }
  else {
    reactProps.showSelector = false
  }
  cfgProp.pickItem(key)
}

onMounted(() => {
  config.globalClickOn(callbackToken)
  storage.on(onSettings)
})
onUnmounted(() => {
  config.globalClickOff(callbackToken)
  storage.off(onSettings)
})
</script>

<template>
  <div :class="$style.option">
    <div :class="$style.comment">
      <span :class="$style.comment_slash">// </span>
      <div :class="$style.comment_editor"
           contenteditable="plaintext-only"
           v-comment-editor></div>
    </div>

    <div :class="[$style.param, {
      [$style.on]: rProps.status === 'on',
      [$style.ignore]: rProps.status === 'ignore'
    }]"
         @click="() => cfgProp.intoView()">
      <div :class="$style.status"
           @click="() => cfgProp.toggleStatus()"
           v-icon></div>
      <div :class="$style.title"
           :style="{ fontSize: reactProps.titleSize, fontWeight: reactProps.titleWeight }">{{ cfgProp.name }}
      </div>
      <div :class="$style.colon">:</div>
      <!--  -->
      <div v-if="EDITOR_TYPE.array">[ </div>
      <template v-if="EDITOR_TYPE.enum">
        <div :class="$style.value">{{ rProps.value }}</div>
      </template>
      <template v-else-if="EDITOR_TYPE.string">
        <div v-value-editor
             :class="[$style.value_editor]"
             contenteditable="plaintext-only"></div>
      </template>
      <template v-else>
        <div>null</div>
      </template>
      <div v-if="EDITOR_TYPE.array"> ]</div>
      <template v-if="EDITOR_TYPE.enum">
        <div :class="$style.selector">
          <div :class="[$style.float_items, { [$style.show_items]: reactProps.showSelector }]">
            <div v-for="item in rItems"
                 :key="item.key"
                 :class="[$style.item, { [$style.item_selected]: item.selected }]"
                 @click="(e: Event) => pickItem(e, item.key)">{{ item.key }}</div>
          </div>
          <Icon icon="arrow_drop_down"
                :class="$style.btn_options"
                @click="(e: Event) => showSelector(e)" />
        </div>
      </template>
    </div>
  </div>
</template>

<style module>
.option {
  border-radius: 4px;
}

.option:hover {
  background-color: var(--color-option-hover);
}

.comment {
  border-radius: 4px;
  color: var(--color-text-comment);
  display: flex;
  gap: 4px;
}

.comment:focus-within {
  outline: var(--var-editor-outline);
  background-color: #fff;
}

.comment_slash {
  text-align: center;
  width: 24px;
  height: 24px;
  user-select: none;
}

.comment_editor {
  flex: 1;
  outline: none;
  padding: 0 4px;
}

.param {
  align-items: center;
  display: flex;
  gap: 4px;
}

.param:hover .title {
  text-decoration: underline;
}

.status {
  text-align: center;
  width: 24px;
  height: 24px;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
}

.colon {
  user-select: none;
}

.value {
  flex: 1;
}

.title {
  cursor: pointer;
  font-weight: bold;
  font-size: 1.0em;
}

.param.on .status {
  fill: var(--color-icon-on);
}

.param.ignore .title,
.param.ignore .status {
  color: var(--color-text-ignore);
  fill: var(--color-text-ignore);
}

.value_editor {
  flex: 1;
  outline: none;
  padding: 0 4px;
  border-radius: 4px;
}

.value_editor:focus-visible {
  outline: var(--var-editor-outline);
  background-color: #fff;
}

.selector {
  position: relative;
  user-select: none;
}

.float_items {
  position: absolute;
  display: none;
  border-radius: 4px;
  padding: 4px;
  background-color: #fff;
  right: 0px;
  min-width: 160px;
  box-shadow: var(--var-box-shadow);
  z-index: 1;
}

.show_items {
  display: block;
}

.item {
  margin-top: 2px;
  margin-bottom: 2px;
  padding-left: 4px;
  padding-right: 4px;
  border-radius: 2px;
  cursor: pointer;
}

.item:hover {
  background-color: var(--color-panel-bg);
}

.item_selected {
  background-color: var(--color-btn-bg);
}

.item_selected {
  color: var(--color-text);
}

.btn_options {
  width: 24px;
  height: 24px;
  cursor: pointer;
  user-select: none;
  fill: var(--color-icon-light);
  flex-shrink: 0;
}

.btn_options:hover {
  fill: var(--color-icon-normal);
}
</style>
