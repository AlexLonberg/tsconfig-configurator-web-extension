<script setup lang="ts">
import { css } from './tags.ts'
import Dialog from './Dialog.vue'

const props = defineProps<{
  messages: string[]
  close: (() => any)
}>()
</script>

<template>
  <Dialog icon="warning"
          title="Error"
          :close="props.close"
          :buttons="[{ key: '_', title: 'Close' }]"
          :class="[css.dialog_error]">
    <div :class="$style.content">
      <div v-for="(html, i) in props.messages"
           :key="i"
           v-html="html"></div>
    </div>
  </Dialog>
</template>

<style module>
.content {
  padding: 8px;
}
</style>
