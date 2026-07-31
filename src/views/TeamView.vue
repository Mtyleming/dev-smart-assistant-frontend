<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import AppLayout from '@/components/layout/AppLayout.vue'
import { useUserStore } from '@/stores/user'
import {
  approveJoinRequestApi,
  assignMemberRoleApi,
  createInviteCodeApi,
  createTeamApi,
  dissolveTeamApi,
  getTeamApi,
  getTeamsStatusApi,
  joinTeamApi,
  listJoinRequestsApi,
  listTeamMembersApi,
  rejectJoinRequestApi,
  removeTeamMemberApi,
  teamRoleLabel,
  TEAM_ROLE_OPTIONS,
  updateTeamApi,
  type InviteCode,
  type JoinRequest,
  type TeamDetail,
  type TeamMember,
  type TeamMemberRole,
} from '@/api/team'

const userStore = useUserStore()
const activeTab = ref('overview')

const loading = ref(false)
const membersLoading = ref(false)
const requestsLoading = ref(false)
const switching = ref(false)
const moduleStatus = ref('')

const team = ref<TeamDetail | null>(null)
const members = ref<TeamMember[]>([])
const joinRequests = ref<JoinRequest[]>([])
const latestInvite = ref<InviteCode | null>(null)

const createVisible = ref(false)
const editVisible = ref(false)
const roleVisible = ref(false)
const approveVisible = ref(false)

const createFormRef = ref<FormInstance>()
const editFormRef = ref<FormInstance>()
const joinFormRef = ref<FormInstance>()

const createForm = reactive({ name: '', description: '' })
const editForm = reactive({ name: '', description: '' })
const joinForm = reactive({ inviteCode: '' })
const roleForm = reactive({ userId: 0, username: '', role: 'developer' as TeamMemberRole })
const approveForm = reactive({ requestId: '', username: '', role: 'developer' as TeamMemberRole })

const nameRules: FormRules = {
  name: [
    { required: true, message: '请输入团队名称', trigger: 'blur' },
    { min: 1, max: 100, message: '团队名称 1-100 个字符', trigger: 'blur' },
  ],
}

const joinRules: FormRules = {
  inviteCode: [{ required: true, message: '请输入邀请码', trigger: 'blur' }],
}

const currentTeamId = computed(() => userStore.currentTeamId)

const isTeamAdmin = computed(() => {
  const uid = userStore.userInfo?.id
  if (!uid) return false
  const self = members.value.find((m) => m.id === uid)
  return self?.role === 'admin'
})

async function loadModuleStatus() {
  try {
    const status = await getTeamsStatusApi()
    moduleStatus.value = typeof status.detail === 'string' ? status.detail : status.status
  } catch {
    moduleStatus.value = ''
  }
}

async function loadTeam() {
  if (!currentTeamId.value) {
    team.value = null
    members.value = []
    joinRequests.value = []
    return
  }

  loading.value = true
  try {
    team.value = await getTeamApi(currentTeamId.value)
    await loadMembers()
    if (isTeamAdmin.value) {
      await loadJoinRequests()
    }
  } catch (err) {
    team.value = null
    members.value = []
    ElMessage.error(err instanceof Error ? err.message : '加载团队信息失败')
  } finally {
    loading.value = false
  }
}

async function loadMembers() {
  if (!currentTeamId.value) return
  membersLoading.value = true
  try {
    members.value = await listTeamMembersApi(currentTeamId.value)
  } catch (err) {
    members.value = []
    ElMessage.error(err instanceof Error ? err.message : '加载成员列表失败')
  } finally {
    membersLoading.value = false
  }
}

async function loadJoinRequests() {
  if (!currentTeamId.value || !isTeamAdmin.value) return
  requestsLoading.value = true
  try {
    joinRequests.value = await listJoinRequestsApi(currentTeamId.value)
  } catch (err) {
    joinRequests.value = []
    ElMessage.error(err instanceof Error ? err.message : '加载入团申请失败')
  } finally {
    requestsLoading.value = false
  }
}

function openCreate() {
  createForm.name = ''
  createForm.description = ''
  createVisible.value = true
}

function openEdit() {
  if (!team.value) return
  editForm.name = team.value.name
  editForm.description = team.value.description || ''
  editVisible.value = true
}

function openRoleDialog(member: TeamMember) {
  roleForm.userId = member.id
  roleForm.username = member.username
  roleForm.role = member.role
  roleVisible.value = true
}

function openApproveDialog(request: JoinRequest) {
  approveForm.requestId = request.requestId
  approveForm.username = request.username
  approveForm.role = 'developer'
  approveVisible.value = true
}

async function handleCreate() {
  const valid = await createFormRef.value?.validate().catch(() => false)
  if (!valid) return
  try {
    const created = await createTeamApi({
      name: createForm.name.trim(),
      description: createForm.description.trim() || null,
    })
    ElMessage.success('团队创建成功')
    createVisible.value = false
    await userStore.switchTeam(created.id)
    await userStore.fetchMyTeams()
    await loadTeam()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '创建失败')
  }
}

async function handleUpdate() {
  if (!team.value) return
  const valid = await editFormRef.value?.validate().catch(() => false)
  if (!valid) return
  try {
    await updateTeamApi(team.value.id, {
      name: editForm.name.trim(),
      description: editForm.description.trim() || null,
    })
    ElMessage.success('团队信息已更新')
    editVisible.value = false
    await userStore.fetchMyTeams()
    await loadTeam()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '更新失败')
  }
}

async function handleDissolve() {
  if (!team.value) return
  await ElMessageBox.confirm(
    `确定解散团队「${team.value.name}」吗？解散后不可恢复。`,
    '解散团队',
    { type: 'warning', confirmButtonText: '确定解散', confirmButtonClass: 'el-button--danger' },
  )
  try {
    const teamId = team.value.id
    await dissolveTeamApi(teamId)
    ElMessage.success('团队已解散')
    team.value = null
    members.value = []
    joinRequests.value = []
    await userStore.fetchMyTeams()
    if (userStore.myTeams.length > 0) {
      const next = userStore.myTeams.find((t) => t.isCurrent) ?? userStore.myTeams[0]
      if (!next.isCurrent) {
        await userStore.switchTeam(next.id)
      }
      await loadTeam()
    } else {
      await userStore.fetchUserInfo()
    }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '解散失败')
  }
}

async function handleJoin() {
  const valid = await joinFormRef.value?.validate().catch(() => false)
  if (!valid) return
  try {
    const result = await joinTeamApi({ invite_code: joinForm.inviteCode.trim() })
    ElMessage.success(`已申请加入「${result.teamName}」，等待管理员审批`)
    joinForm.inviteCode = ''
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '申请失败')
  }
}

async function handleCreateInvite() {
  if (!team.value) return
  try {
    latestInvite.value = await createInviteCodeApi(team.value.id)
    ElMessage.success('邀请码已生成（7 天有效，一次性）')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '生成邀请码失败')
  }
}

async function handleAssignRole() {
  if (!team.value) return
  try {
    await assignMemberRoleApi(team.value.id, roleForm.userId, roleForm.role)
    ElMessage.success('角色已更新')
    roleVisible.value = false
    await loadMembers()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '更新角色失败')
  }
}

async function handleRemoveMember(member: TeamMember) {
  if (!team.value) return
  await ElMessageBox.confirm(`确定将「${member.username}」移出团队吗？`, '移除成员', { type: 'warning' })
  try {
    await removeTeamMemberApi(team.value.id, member.id)
    ElMessage.success('成员已移除')
    await loadMembers()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '移除失败')
  }
}

async function handleApprove() {
  if (!team.value) return
  try {
    await approveJoinRequestApi(team.value.id, approveForm.requestId, approveForm.role)
    ElMessage.success('已通过入团申请')
    approveVisible.value = false
    await loadJoinRequests()
    await loadMembers()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '审批失败')
  }
}

async function handleReject(request: JoinRequest) {
  if (!team.value) return
  await ElMessageBox.confirm(`确定拒绝「${request.username}」的入团申请吗？`, '拒绝申请', { type: 'warning' })
  try {
    await rejectJoinRequestApi(team.value.id, request.requestId)
    ElMessage.success('已拒绝申请')
    await loadJoinRequests()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '操作失败')
  }
}

async function handleSwitchTeam(teamId: number) {
  if (teamId === currentTeamId.value) return
  switching.value = true
  try {
    await userStore.switchTeam(teamId)
    ElMessage.success('已切换团队')
    await loadTeam()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '切换失败')
  } finally {
    switching.value = false
  }
}

function formatTime(value: string) {
  try {
    return new Date(value).toLocaleString('zh-CN')
  } catch {
    return value
  }
}

watch(currentTeamId, () => loadTeam())

onMounted(async () => {
  await loadModuleStatus()
  await userStore.fetchMyTeams()
  await loadTeam()
})
</script>

<template>
  <AppLayout>
    <div class="team-page">
      <div v-if="moduleStatus" class="status-tip page-card">
        <el-icon><InfoFilled /></el-icon>
        <span>{{ moduleStatus }}</span>
      </div>

      <el-tabs v-model="activeTab" class="team-tabs">
        <!-- 概览 -->
        <el-tab-pane label="团队概览" name="overview">
          <div class="page-card">
            <div class="toolbar">
              <h3>当前团队</h3>
              <div class="actions">
                <el-button @click="loadTeam">刷新</el-button>
                <el-button type="primary" @click="openCreate">创建团队</el-button>
              </div>
            </div>

            <el-empty v-if="!loading && !team" description="暂无团队，可创建或申请加入">
              <el-button type="primary" @click="openCreate">创建团队</el-button>
            </el-empty>

            <div v-else v-loading="loading" class="team-info">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="团队 ID">{{ team?.id }}</el-descriptions-item>
                <el-descriptions-item label="团队名称">{{ team?.name }}</el-descriptions-item>
                <el-descriptions-item label="成员数量">{{ team?.memberCount ?? 0 }}</el-descriptions-item>
                <el-descriptions-item label="团队描述">
                  {{ team?.description || '暂无描述' }}
                </el-descriptions-item>
              </el-descriptions>
              <div v-if="team && isTeamAdmin" class="team-actions">
                <el-button type="primary" @click="openEdit">编辑团队</el-button>
                <el-button type="danger" plain @click="handleDissolve">解散团队</el-button>
              </div>
            </div>
          </div>

          <div class="page-card switch-section">
            <h3>切换团队</h3>
            <p class="hint">切换到您已加入的其他团队（将重新签发 Token）</p>
            <div v-loading="switching" class="team-switch-list">
              <el-empty v-if="userStore.myTeams.length === 0" description="暂无已加入团队" />
              <el-radio-group
                v-else
                :model-value="currentTeamId"
                @change="(val: number) => handleSwitchTeam(val)"
              >
                <el-radio-button
                  v-for="item in userStore.myTeams"
                  :key="item.id"
                  :value="item.id"
                >
                  {{ item.name }}（{{ teamRoleLabel(item.role) }}）
                </el-radio-button>
              </el-radio-group>
            </div>
          </div>
        </el-tab-pane>

        <!-- 成员 -->
        <el-tab-pane label="成员管理" name="members">
          <div class="page-card">
            <div class="toolbar">
              <h3>成员列表</h3>
              <el-button @click="loadMembers">刷新</el-button>
            </div>
            <el-table v-loading="membersLoading" :data="members">
              <el-table-column prop="id" label="用户 ID" width="100" />
              <el-table-column prop="username" label="用户名" min-width="140" />
              <el-table-column prop="role" label="团队角色" width="140">
                <template #default="{ row }">
                  <el-tag :type="row.role === 'admin' ? 'warning' : 'info'" size="small">
                    {{ teamRoleLabel(row.role) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column v-if="isTeamAdmin" label="操作" width="200">
                <template #default="{ row }">
                  <el-button type="primary" link size="small" @click="openRoleDialog(row)">
                    分配角色
                  </el-button>
                  <el-button
                    v-if="row.role !== 'admin'"
                    type="danger"
                    link
                    size="small"
                    @click="handleRemoveMember(row)"
                  >
                    移除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <!-- 邀请与加入 -->
        <el-tab-pane label="邀请与加入" name="invite">
          <div class="page-card">
            <h3>申请加入团队</h3>
            <el-form
              ref="joinFormRef"
              :model="joinForm"
              :rules="joinRules"
              label-width="80px"
              class="join-form"
            >
              <el-form-item label="邀请码" prop="inviteCode">
                <el-input v-model="joinForm.inviteCode" placeholder="输入团队邀请码" clearable />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="handleJoin">提交申请</el-button>
              </el-form-item>
            </el-form>
          </div>

          <div v-if="team && isTeamAdmin" class="page-card">
            <div class="toolbar">
              <h3>生成邀请码</h3>
              <el-button type="primary" @click="handleCreateInvite">生成邀请码</el-button>
            </div>
            <el-alert
              title="邀请码 7 天有效且一次性使用，请妥善分享给待加入成员"
              type="info"
              :closable="false"
              show-icon
            />
            <div v-if="latestInvite" class="invite-result">
              <p><strong>邀请码：</strong>{{ latestInvite.inviteCode }}</p>
              <p><strong>过期时间：</strong>{{ formatTime(latestInvite.expiresAt) }}</p>
            </div>
          </div>
        </el-tab-pane>

        <!-- 入团审批 -->
        <el-tab-pane v-if="isTeamAdmin" label="入团审批" name="requests">
          <div class="page-card">
            <div class="toolbar">
              <h3>待审批申请</h3>
              <el-button @click="loadJoinRequests">刷新</el-button>
            </div>
            <el-table v-loading="requestsLoading" :data="joinRequests">
              <el-table-column prop="username" label="申请人" min-width="120" />
              <el-table-column prop="userId" label="用户 ID" width="100" />
              <el-table-column prop="createdAt" label="申请时间" min-width="180">
                <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="100" />
              <el-table-column label="操作" width="180">
                <template #default="{ row }">
                  <el-button type="primary" link size="small" @click="openApproveDialog(row)">
                    通过
                  </el-button>
                  <el-button type="danger" link size="small" @click="handleReject(row)">
                    拒绝
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-if="!requestsLoading && joinRequests.length === 0" description="暂无待审批申请" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 创建团队 -->
    <el-dialog v-model="createVisible" title="创建团队" width="480px">
      <el-form ref="createFormRef" :model="createForm" :rules="nameRules" label-width="80px">
        <el-form-item label="团队名称" prop="name">
          <el-input v-model="createForm.name" placeholder="1-100 个字符" clearable />
        </el-form-item>
        <el-form-item label="团队描述">
          <el-input v-model="createForm.description" type="textarea" :rows="3" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreate">创建</el-button>
      </template>
    </el-dialog>

    <!-- 编辑团队 -->
    <el-dialog v-model="editVisible" title="编辑团队" width="480px">
      <el-form ref="editFormRef" :model="editForm" :rules="nameRules" label-width="80px">
        <el-form-item label="团队名称" prop="name">
          <el-input v-model="editForm.name" placeholder="1-100 个字符" clearable />
        </el-form-item>
        <el-form-item label="团队描述">
          <el-input v-model="editForm.description" type="textarea" :rows="3" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="handleUpdate">保存</el-button>
      </template>
    </el-dialog>

    <!-- 分配角色 -->
    <el-dialog v-model="roleVisible" title="分配成员角色" width="400px">
      <p class="dialog-hint">用户：{{ roleForm.username }}</p>
      <el-select v-model="roleForm.role" style="width: 100%">
        <el-option
          v-for="opt in TEAM_ROLE_OPTIONS"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
      <template #footer>
        <el-button @click="roleVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAssignRole">保存</el-button>
      </template>
    </el-dialog>

    <!-- 审批通过 -->
    <el-dialog v-model="approveVisible" title="审批通过" width="400px">
      <p class="dialog-hint">申请人：{{ approveForm.username }}</p>
      <el-select v-model="approveForm.role" style="width: 100%">
        <el-option
          v-for="opt in TEAM_ROLE_OPTIONS"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
      <template #footer>
        <el-button @click="approveVisible = false">取消</el-button>
        <el-button type="primary" @click="handleApprove">通过</el-button>
      </template>
    </el-dialog>
  </AppLayout>
</template>

<style scoped lang="scss">
.team-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  color: #606266;
  font-size: 13px;
}

.team-tabs {
  :deep(.el-tabs__content) {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  h3 {
    margin: 0;
  }
}

.actions {
  display: flex;
  gap: 8px;
}

.team-info .team-actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
}

.switch-section {
  h3 {
    margin: 0 0 8px;
  }

  .hint {
    margin: 0 0 16px;
    color: #909399;
    font-size: 13px;
  }
}

.team-switch-list {
  min-height: 48px;
}

.join-form {
  max-width: 480px;
}

.invite-result {
  margin-top: 16px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;

  p {
    margin: 4px 0;
  }
}

.dialog-hint {
  margin: 0 0 12px;
  color: #606266;
}
</style>
