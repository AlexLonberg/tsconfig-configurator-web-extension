<script setup lang="ts">
import { shallowRef, onMounted, onUnmounted } from 'vue'
import type { CfgCategory } from './config.ts'
import { STORAGE_KEYS } from './storage.ts'
import CfgProperty from './CfgProperty.vue'

const props = defineProps<{
  category: CfgCategory
}>()

const settings = props.category.settings
const hideOption = shallowRef(settings.hideIgnoredOptions)

function onSettings (e: { key: string }) {
  if (e.key === STORAGE_KEYS.settings && hideOption.value !== settings.hideIgnoredOptions) {
    hideOption.value = settings.hideIgnoredOptions
  }
}

onMounted(() => {
  props.category.storage.on(onSettings)
})
onUnmounted(() => {
  props.category.storage.off(onSettings)
})
</script>

<template>
  <div :class="$style.category">
    <div :class="$style.title">{{ props.category.name }}</div>
    <div :class="$style.options">
      <CfgProperty v-for="item in props.category.rItems"
                   :key="item.vKey"
                   :property="item"
                   :class="{ [$style.hidden]: (hideOption && item.rProps.status === 'ignore') || item.rProps.invisible }" />
    </div>
  </div>
</template>

<style module>
.category {
  /* Это необязательно - установлено чтобы не подсвечивалась ошибка пустого category, который хочется оставить */
  display: block;
}

.title {
  text-align: center;
  color: var(--color-text-comment);
  font-weight: bold;
}

.options {
  margin-bottom: 1em;
}

.hidden {
  display: none;
}
</style>
