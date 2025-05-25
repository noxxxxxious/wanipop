<template>
  <div class="settings-view">
    Settings
  </div>
</template>

<script setup lang="ts">

import { useConfigStore } from '../stores/config'
const configStore = useConfigStore()
</script>

<style scoped>
.settings-view {
  
}
</style>
