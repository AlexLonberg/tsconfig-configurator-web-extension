<script setup lang="ts">
import { watch } from 'vue'
import type { TIconKey } from './icons.ts'
import { css } from './tags.ts'
import { getIcon } from './icons.ts'

const props = defineProps<{
  icon: TIconKey
}>()

const icons = {
  _cache: null as any,
  _fallback (name: TIconKey) {
    const icon = getIcon(name)
    if (!this._cache) {
      this._cache = new Map<any, any>([[name, icon]])
    }
    else {
      this._cache.set(name, icon)
    }
    return icon
  },
  get (name: TIconKey) {
    return this._cache?.get(name) ?? this._fallback(name)
  }
}

let element = {
  set textContent (_: any) { /**/ },
  appendChild (_: any) { /**/ }
}

watch(() => props.icon, (name: TIconKey) => {
  element.textContent = ''
  element.appendChild(icons.get(name))
})

const vMnt = {
  mounted (el: HTMLDivElement) {
    element = el
    element.appendChild(icons.get(props.icon))
  }
}
</script>

<template>
  <div :class="css.icon"
       v-mnt></div>
</template>
