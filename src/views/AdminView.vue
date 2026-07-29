<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import AppLayout from '@/components/layout/AppLayout.vue'
import { fetchUsersApi, updateUserApi, type AdminUser } from '@/api/admin'

const loading = ref(false)
const users = ref<AdminUser[]>([])
const editVisible = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({
  id: 0,
  username: '',
  role: 'user',
  teamId: 1,
  status: 'active' as AdminUser['status'],
})

const rules: FormRules = {
  username: [{ required: true, message: '用户名不能为空', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

const demoUsers: AdminUser[] = [
  { id: 1, username: 'admin', role: 'admin', teamId: 1, status: 'active' },
  { id: 2, username: 'alice', role: 'user', teamId: 1, status: 'active' },
  { id: 3, username: 'bob', role: 'user', teamId: 2, status: 'disabled' },
]

async function loadUsers() {
  loading.value = true
  try {
    users.value = await fetchUsersApi()
  } catch {
    users.value = [...demoUsers]
    ElMessage.warning('用户接口不可用，已加载演示数据')
  } finally {
    loading.value = false
  }
}

function openEdit(row: AdminUser) {
  form.id = row.id
  form.username = row.username
  form.role = row.role
  form.teamId = row.teamId
  form.status = row.status
  editVisible.value = true
}

async function saveUser() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  try {
    await updateUserApi(form.id, {
      role: form.role,
      teamId: form.teamId,
      status: form.status,
    })
  } catch {
    // 本地演示更新
  }

  const target = users.value.find((u) => u.id === form.id)
  if (target) {
    target.role = form.role
    target.teamId = form.teamId
    target.status = form.status
  }

  ElMessage.success('保存成功')
  editVisible.value = false
}

onMounted(loadUsers)
</script>

<template>
  <AppLayout>
    <div class="admin-page page-card">
      <div class="toolbar">
        <h3>用户管理</h3>
        <el-button @click="loadUsers">刷新</el-button>
      </div>

      <el-table v-loading="loading" :data="users">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" min-width="140" />
        <el-table-column prop="role" label="角色" width="120">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'warning' : 'info'" size="small">
              {{ row.role === 'admin' ? '管理员' : '普通用户' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="teamId" label="团队 ID" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
              {{ row.status === 'active' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="editVisible" title="编辑用户" width="460px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" disabled />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" style="width: 100%">
            <el-option label="普通用户" value="user" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="团队 ID">
          <el-input-number v-model="form.teamId" :min="1" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="active">启用</el-radio>
            <el-radio value="disabled">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="saveUser">保存</el-button>
      </template>
    </el-dialog>
  </AppLayout>
</template>

<style scoped lang="scss">
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  h3 {
    margin: 0;
  }
}
</style>
