import { defineStore } from 'pinia'
import { ref } from 'vue'

/** 全局应用状态：主题、侧边栏、全局加载 */
export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const globalLoading = ref(false)
  const theme = ref<'light' | 'dark'>('light')

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setLoading(loading: boolean) {
    globalLoading.value = loading
  }

  function setTheme(next: 'light' | 'dark') {
    theme.value = next
  }

  return {
    sidebarCollapsed,
    globalLoading,
    theme,
    toggleSidebar,
    setLoading,
    setTheme,
  }
})
