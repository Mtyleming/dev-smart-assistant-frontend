<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const appStore = useAppStore()

const menuItems = computed(() => {
  const items = [
    { path: '/chat', title: '对话助手', icon: 'ChatDotRound' },
    { path: '/knowledge', title: '知识库管理', icon: 'FolderOpened' },
  ]
  if (userStore.isAdmin) {
    items.push({ path: '/admin', title: '管理后台', icon: 'Setting' })
  }
  return items
})

async function handleLogout() {
  await ElMessageBox.confirm('确定退出登录吗？', '提示', { type: 'warning' })
  userStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="app-layout" :class="{ collapsed: appStore.sidebarCollapsed }">
    <aside class="sidebar">
      <div class="brand">
        <el-icon :size="22"><Cpu /></el-icon>
        <span v-show="!appStore.sidebarCollapsed">开发智能助手</span>
      </div>

      <el-menu
        :default-active="route.path"
        :collapse="appStore.sidebarCollapsed"
        background-color="#1f2d3d"
        text-color="#c0c4cc"
        active-text-color="#409eff"
        router
      >
        <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
          <el-icon>
            <component :is="item.icon" />
          </el-icon>
          <template #title>{{ item.title }}</template>
        </el-menu-item>
      </el-menu>
    </aside>

    <section class="main">
      <header class="header">
        <div class="header-left">
          <el-button text @click="appStore.toggleSidebar()">
            <el-icon :size="18"><Fold v-if="!appStore.sidebarCollapsed" /><Expand v-else /></el-icon>
          </el-button>
          <span class="page-title">{{ route.meta.title }}</span>
        </div>
        <div class="header-right">
          <span class="username">{{ userStore.userInfo?.username || '用户' }}</span>
          <el-tag v-if="userStore.isAdmin" size="small" type="warning">管理员</el-tag>
          <el-button type="danger" link @click="handleLogout">退出</el-button>
        </div>
      </header>
      <main class="content">
        <slot />
      </main>
    </section>
  </div>
</template>

<style scoped lang="scss">
.app-layout {
  display: flex;
  width: 100%;
  height: 100%;
}

.sidebar {
  width: 220px;
  background: var(--app-sidebar-bg);
  color: var(--app-sidebar-text);
  transition: width 0.2s ease;
  overflow: hidden;

  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
    height: var(--app-header-height);
    padding: 0 16px;
    color: #fff;
    font-weight: 600;
    white-space: nowrap;
  }

  .el-menu {
    border-right: none;
  }
}

.collapsed .sidebar {
  width: 64px;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.header {
  height: var(--app-header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
}

.username {
  color: #606266;
}

.content {
  flex: 1;
  padding: var(--app-content-padding);
  overflow: auto;
}
</style>
