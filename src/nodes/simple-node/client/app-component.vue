<script lang="ts" setup>
import { ref } from 'vue'

const number = ref(1)

function handleClick() {
  number.value++
}
</script>

<template>
  <div>
    {{ number + 2 }}
    <button class=" bg-blue-500 text-white p-2 rounded-md" @click="handleClick">
      button
    </button>
  </div>
</template>
