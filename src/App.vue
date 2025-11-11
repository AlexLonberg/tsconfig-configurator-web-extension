<script setup lang="ts">
import type { Component } from 'vue'
import type { TEnvironmentProps } from './environment.ts'
import type { Control } from './control.ts'
import VControl from './Control.vue'

const props = defineProps<{
  rProps: TEnvironmentProps
  rFloats: { key: symbol, item: Component }[]
  control: Control
}>()
</script>

<template>
  <template v-if="props.rProps.content">
    <component :is="props.rProps.content"></component>
  </template>
  <template v-for="item in props.rFloats"
            :key="item.key">
    <component :is="item.item"></component>
  </template>
  <VControl :control="props.control" />
  <template v-if="props.rProps.modal">
    <component :is="props.rProps.modal"></component>
  </template>
</template>
