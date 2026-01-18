<template>
  <view class="base" :data-index="props.unitKey">
    <span>
      <slot></slot>
    </span>
  </view>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  unitKey: string;
  color?: string;
}>();
console.log(props.unitKey);
const color = computed(() => props.color || "white");
</script>

<style scoped>
.base {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;

  span {
    color: v-bind(color);
  }
}
</style>
