<script lang="ts" setup>
import { ref } from 'vue'

const number = ref(1)

function handleClick() {
  number.value++
}
</script>

<template>
  <div>
    {{ number }}
    <button @click="handleClick">
      按钮
    </button>
  </div>
</template>
