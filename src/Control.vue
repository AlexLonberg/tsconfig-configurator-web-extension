<script setup lang="ts">
import { css } from './tags.ts'
import type { Control } from './control.ts'
import Icon from './Icon.vue'

const props = defineProps<{
  control: Control
}>()

const cnt = props.control
const rProps = cnt.rProps
</script>

<template>
  <div :class="css.control_panel">
    <button :class="[css.btn, { [css.active]: rProps.content }]"
            @click="() => cnt.content()">
      <Icon icon="view_cozy" />
    </button>
    <button :class="[css.btn, { [css.active]: rProps.config }]"
            @click="() => cnt.config()">
      <Icon icon="construction" />
    </button>
    <button :class="[css.btn, { [css.active]: rProps.settings }]"
            @click="() => cnt.settings()">
      <Icon icon="settings" />
    </button>
    <button :class="[css.btn, $style.notification, { [$style.active]: rProps.notification }]"
            @click="() => cnt.notification()">
      <Icon icon="warning" />
    </button>
    <button :class="css.btn"
            @click="() => cnt.quit()">
      <Icon icon="close_small" />
    </button>
  </div>
</template>

<style module>
.notification {
  display: none;
  fill: var(--color-error);
}

.notification.active {
  display: block;
}
</style>
