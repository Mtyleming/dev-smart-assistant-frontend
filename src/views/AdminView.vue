<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppLayout from '@/components/layout/AppLayout.vue'
import {
  getOrganizationTreeApi,
  updateUserStatusApi,
  type AdminOrganizationTree,
  type AdminUserNode,
} from '@/api/admin'
import { teamRoleLabel } from '@/api/team'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const loading = ref(false)
const togglingId = ref<number | null>(null)
const orgTree = ref<AdminOrganizationTree>({ teams: [], unassigned_users: [] })

async function loadOrgTree() {
  loading.value = true
  try {
    orgTree.value = await getOrganizationTreeApi()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '加载组织树失败')
  } finally {
    loading.value = false
  }
}

async function handleToggleStatus(user: AdminUserNode, isActive: boolean) {
  if (user.id === userStore.userInfo?.id && !isActive) {
    ElMessage.warning('不能停用自己的账号')
    return
  }

  if (!isActive) {
    try {
      await ElMessageBox.confirm(`确定停用用户「${user.username}」吗？停用后该用户将立即无法登录。`, '停用用户', {
        type: 'warning',
        confirmButtonText: '停用',
        cancelButtonText: '取消',
      })
    } catch {
      return
    }
  }

  togglingId.value = user.id
  try {
    await updateUserStatusApi(user.id, isActive)
    user.is_active = isActive
    ElMessage.success(isActive ? '已启用用户' : '已停用用户')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '操作失败')
  } finally {
    togglingId.value = null
  }
}

function onStatusChange(user: AdminUserNode, val: string | number | boolean) {
  handleToggleStatus(user, Boolean(val))
}

onMounted(loadOrgTree)
</script>

<template>
  <AppLayout>
    <div class="admin-page page-card">
      <div class="toolbar">
        <div>
          <h3>用户管理</h3>
          <p class="subtitle">查看组织树，启用或停用用户账号</p>
        </div>
        <el-button @click="loadOrgTree">刷新</el-button>
      </div>

      <div v-loading="loading" class="org-tree">
        <el-empty v-if="!loading && orgTree.teams.length === 0 && orgTree.unassigned_users.length === 0" description="暂无用户数据" />

        <section v-for="team in orgTree.teams" :key="team.id" class="team-section">
          <div class="team-header">
            <h4>{{ team.name }}</h4>
            <span class="team-meta">
              ID {{ team.id }} · {{ team.member_count }} 人
              <template v-if="team.description"> · {{ team.description }}</template>
            </span>
          </div>
          <el-table :data="team.members" size="small" stripe>
            <el-table-column prop="username" label="用户名" min-width="120" />
            <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip />
            <el-table-column label="团队角色" width="110">
              <template #default="{ row }">
                <el-tag size="small" type="info">{{ teamRoleLabel(row.role) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="超级管理员" width="100" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.is_super_admin" size="small" type="warning">是</el-tag>
                <span v-else class="muted">—</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.is_active ? 'success' : 'danger'" size="small">
                  {{ row.is_active ? '启用' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="启停用" width="100" align="center">
              <template #default="{ row }">
                <el-switch
                  :model-value="row.is_active"
                  :loading="togglingId === row.id"
                  :disabled="row.id === userStore.userInfo?.id"
                  @change="onStatusChange(row, $event)"
                />
              </template>
            </el-table-column>
          </el-table>
        </section>

        <section v-if="orgTree.unassigned_users.length > 0" class="team-section">
          <div class="team-header">
            <h4>未加入团队</h4>
            <span class="team-meta">{{ orgTree.unassigned_users.length }} 人</span>
          </div>
          <el-table :data="orgTree.unassigned_users" size="small" stripe>
            <el-table-column prop="username" label="用户名" min-width="120" />
            <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip />
            <el-table-column label="团队角色" width="110">
              <template #default="{ row }">
                <el-tag size="small" type="info">{{ teamRoleLabel(row.role) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="超级管理员" width="100" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.is_super_admin" size="small" type="warning">是</el-tag>
                <span v-else class="muted">—</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.is_active ? 'success' : 'danger'" size="small">
                  {{ row.is_active ? '启用' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="启停用" width="100" align="center">
              <template #default="{ row }">
                <el-switch
                  :model-value="row.is_active"
                  :loading="togglingId === row.id"
                  :disabled="row.id === userStore.userInfo?.id"
                  @change="onStatusChange(row, $event)"
                />
              </template>
            </el-table-column>
          </el-table>
        </section>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped lang="scss">
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;

  h3 {
    margin: 0 0 4px;
  }

  .subtitle {
    margin: 0;
    color: #909399;
    font-size: 13px;
  }
}

.org-tree {
  min-height: 200px;
}

.team-section {
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }
}

.team-header {
  margin-bottom: 10px;

  h4 {
    margin: 0 0 4px;
    font-size: 15px;
  }

  .team-meta {
    color: #909399;
    font-size: 13px;
  }
}

.muted {
  color: #c0c4cc;
}
</style>
