<script setup lang="ts">
import { onUnmounted } from 'vue'
import { css } from './tags.ts'

const props = defineProps<{
  navigation: HTMLElement
  description: HTMLElement
  on: ((type: 'mounted' | 'unmounted') => any)
}>()

const wrappers = {
  navigation: null as (null | HTMLDivElement),
  description: null as (null | HTMLDivElement)
}

onUnmounted(() => {
  wrappers.navigation = null
  wrappers.description = null
  props.on('unmounted')
})

function on () {
  if (wrappers.navigation && wrappers.description) {
    wrappers.navigation.appendChild(props.navigation)
    wrappers.description.appendChild(props.description)
    props.on('mounted')
  }
}

const vMntNav = {
  mounted (el: HTMLDivElement) {
    wrappers.navigation = el
    on()
  }
}
const vMntDes = {
  mounted (el: HTMLDivElement) {
    wrappers.description = el
    on()
  }
}
</script>

<template>
  <div :class="css.content_wrapper">
    <div :class="[css.notranslate, css.content_navigation]"
         v-mnt-nav></div>
    <div :class="css.content_description"
         v-mnt-des></div>
  </div>
</template>
