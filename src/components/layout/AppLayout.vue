<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { ElMessage, ElMessageBox } from 'element-plus'
import { logoutApi } from '@/api/auth'
import { teamRoleLabel } from '@/api/team'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const appStore = useAppStore()
const switchingTeam = ref(false)

const currentTeamName = computed(() => {
  const team = userStore.currentTeam
  if (team) return team.name
  const id = userStore.currentTeamId
  return id ? `团队 ${id}` : '未加入团队'
})

const menuItems = computed(() => {
  if (userStore.isSuperAdmin) {
    return [{ path: '/admin', title: '管理后台', icon: 'Setting' }]
  }
  return [
    { path: '/chat', title: '对话助手', icon: 'ChatDotRound' },
    { path: '/knowledge', title: '知识库管理', icon: 'FolderOpened' },
    { path: '/teams', title: '团队管理', icon: 'UserFilled' },
  ]
})

onMounted(() => {
  if (userStore.isLoggedIn && !userStore.isSuperAdmin) {
    userStore.fetchMyTeams()
  }
})

async function handleLogout() {
  await ElMessageBox.confirm('确定退出登录吗？', '提示', { type: 'warning' })
  try {
    await logoutApi()
  } catch {
    // 即使后端退出失败，也清除本地登录态
  }
  userStore.logout()
  ElMessage.success('已退出登录')
  router.push('/login')
}

async function handleSwitchTeam(teamId: number) {
  if (teamId === userStore.currentTeamId || switchingTeam.value) return
  switchingTeam.value = true
  try {
    await userStore.switchTeam(teamId)
    ElMessage.success('已切换团队')
    if (route.path !== '/teams') {
      router.push('/teams')
    }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '切换团队失败')
  } finally {
    switchingTeam.value = false
  }
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
          <el-dropdown v-if="!userStore.isSuperAdmin" trigger="click" @command="handleSwitchTeam">
            <span class="team-switcher">
              <el-icon><UserFilled /></el-icon>
              {{ currentTeamName }}
              <el-icon class="arrow"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="team in userStore.myTeams"
                  :key="team.id"
                  :command="team.id"
                  :disabled="team.isCurrent"
                >
                  <span class="team-item">
                    <span>{{ team.name }}（ID: {{ team.id }}）</span>
                    <el-tag size="small" type="info">{{ teamRoleLabel(team.role) }}</el-tag>
                    <el-tag v-if="team.isCurrent" size="small" type="success">当前</el-tag>
                  </span>
                </el-dropdown-item>
                <el-dropdown-item v-if="userStore.myTeams.length === 0" disabled>
                  暂无已加入团队
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <span class="username">{{ userStore.userInfo?.username || '用户' }}</span>
          <el-tag v-if="userStore.isSuperAdmin" size="small" type="warning">超级管理员</el-tag>
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

.team-switcher {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  color: #409eff;
  font-size: 13px;

  .arrow {
    font-size: 12px;
  }
}

.team-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.content {
  flex: 1;
  padding: var(--app-content-padding);
  overflow: auto;
}
</style>
