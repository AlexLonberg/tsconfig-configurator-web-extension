<script setup lang="ts">
import type { TIconKey } from './icons.ts'
import { css } from './tags.ts'
import Icon from './Icon.vue'

const props = defineProps<{
  icon: TIconKey
  title: string
  buttons: readonly { readonly key: string, readonly title: string }[]
  close (key: string): any
}>()
</script>

<template>
  <div :class="css.dialog_panel">
    <div :class="[css.notranslate, css.header]">
      <Icon :icon="props.icon" />
      <span :class="css.title">{{ props.title }}</span>
      <span :class="css.label">TS Extension</span>
    </div>
    <div :class="css.content">
      <slot name="default"></slot>
    </div>
    <div :class="[css.notranslate, css.footer]">
      <button v-for="item in props.buttons"
              :key="item.key"
              :class="css.btn"
              @click="() => props.close(item.key)">
        {{ item.title }}
      </button>
    </div>
  </div>
</template>
