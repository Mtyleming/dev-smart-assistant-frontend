<script setup lang="ts">
/**
 * 根组件：只负责挂载路由出口
 * 各页面布局由 views 与 components/layout 自行处理
 */
</script>

<template>
  <router-view />
</template>

<style>
html,
body,
#app {
  width: 100%;
  height: 100%;
  margin: 0;
}
</style>
