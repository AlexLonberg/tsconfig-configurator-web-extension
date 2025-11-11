<script setup lang="ts">
import { shallowReactive } from 'vue'
import type { Configurator } from './config.ts'
import { css } from './tags.ts'
import { STORAGE_KEYS } from './storage.ts'
import Icon from './Icon.vue'
import CfgCategory from './CfgCategory.vue'

const props = defineProps<{
  cfg: Configurator
  description: HTMLElement
  on: ((type: 'mounted' | 'unmounted') => any)
}>()

const config = props.cfg
const presets = config.presets
const settings = config.env.settings

function iconOfHideIgnoredOptions () {
  return (settings.hideIgnoredOptions ? 'visibility_off' : 'visibility') as ('visibility_off' | 'visibility')
}
const reactProps = shallowReactive({
  hideIcon: iconOfHideIgnoredOptions()
})
function onSettings (e: { key: string }) {
  if (e.key === STORAGE_KEYS.settings) {
    reactProps.hideIcon = iconOfHideIgnoredOptions()
  }
}

function onClick () {
  config.globalClickEmit(onClick)
}

const vMntDes = {
  mounted (el: HTMLDivElement) {
    el.appendChild(props.description)
    props.cfg.env.storage.on(onSettings)
    props.on('mounted')
  },
  unmounted () {
    props.cfg.env.storage.off(onSettings)
    props.on('unmounted')
  }
}
</script>

<template>
  <div :class="css.content_wrapper"
       @click="onClick">

    <div spellcheck="false"
         :class="[css.notranslate, css.content_config]">

      <div :class="css.header">
        <Icon icon="construction" />
        <span :class="css.title">Configurator</span>
        <input type="text"
               :class="$style.filter"
               @input="(e) => config.filter((e.currentTarget as any)?.value ?? '')">
        <button :class="[css.btn, $style.btn_visible]"
                @click="() => settings.toggleHideIgnoredOptions()">
          <Icon :icon="reactProps.hideIcon"
                :class="$style.btn_visible_icon" />
        </button>
        <button :class="css.btn"
                @click="() => props.cfg.download()">
          <span>Download JSON</span>
        </button>
      </div>

      <div :class="css.content">
        <div v-for="item in props.cfg.rItems"
             :key="item.vKey">
          <CfgCategory :category="item" />
        </div>
      </div>

      <div :class="css.footer">
        <div :class="$style.presets">
          <button v-for="item in presets.rItems"
                  :key="item.key"
                  :disabled="item.disabled"
                  :class="[css.btn, $style.preset_btn, { [css.pressed]: item.selected }]"
                  @click="() => presets.changePreset(item.key)">

            <div>{{ item.name }}</div>
            <Icon icon="edit"
                  :class="$style.preset_btn_edit"
                  @click="(e: Event) => { e.stopPropagation(); presets.editPreset(item.key) }" />
          </button>
        </div>

        <div :class="$style.btn_add_preset">
          <button :disabled="presets.rProps.disabled"
                  :class="[css.btn]"
                  @click="() => presets.createPreset()">
            <Icon icon="add_2" />
          </button>
        </div>
      </div>

    </div>

    <div :class="css.content_description"
         v-mnt-des></div>
  </div>
</template>

<style module>
input.filter {
  all: initial;
  font-family: inherit;
  box-sizing: border-box;
  height: 24px;
  flex: 1;
  outline: none;
  padding: 8px;
  border-radius: 4px;
  background-color: #fff;
}

input.filter:focus-visible {
  outline: var(--var-editor-outline);
}

.btn_visible {
  padding: 8px;
}

.btn_visible_icon {
  width: 16px;
  height: 16px;
}

.presets {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex-shrink: 0;
}

.preset_btn {
  display: inline-flex;
  padding: 4px 4px 4px 8px;
  gap: 8px;
}

.preset_btn_edit {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.preset_btn:disabled>.preset_btn_edit {
  cursor: default;
}

.preset_btn:not(:disabled)>.preset_btn_edit:hover {
  background-color: var(--color-btn-bg);
}
</style>
