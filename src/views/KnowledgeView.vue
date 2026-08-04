<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import AppLayout from '@/components/layout/AppLayout.vue'
import {
  pageKnowledgeApi,
  createKnowledgeApi,
  updateKnowledgeApi,
  deleteKnowledgeApi,
  getKnowledgeStatusApi,
  type KnowledgeBase,
} from '@/api/knowledge'

const loading = ref(false)
const knowledgeBases = ref<KnowledgeBase[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const moduleStatus = ref('')

const createVisible = ref(false)
const editVisible = ref(false)
const submitting = ref(false)

const createFormRef = ref<FormInstance>()
const editFormRef = ref<FormInstance>()

const createForm = reactive({ name: '', description: '' })
const editForm = reactive({ id: 0, name: '', description: '' })

const nameRules: FormRules = {
  name: [
    { required: true, message: '请输入知识库名称', trigger: 'blur' },
    { min: 1, max: 200, message: '名称长度 1-200 个字符', trigger: 'blur' },
  ],
}

/** 把后端时间格式化成更易读的本地时间 */
function formatTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

async function loadModuleStatus() {
  try {
    const status = await getKnowledgeStatusApi()
    moduleStatus.value = typeof status.detail === 'string' ? status.detail : status.status
  } catch {
    moduleStatus.value = ''
  }
}

async function loadList() {
  loading.value = true
  try {
    const result = await pageKnowledgeApi({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value.trim() || null,
    })
    knowledgeBases.value = result.items
    total.value = result.total
    page.value = result.page
  } catch (error) {
    knowledgeBases.value = []
    total.value = 0
    ElMessage.error(error instanceof Error ? error.message : '加载知识库失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  page.value = 1
  loadList()
}

function handlePageChange(nextPage: number) {
  page.value = nextPage
  loadList()
}

function handleSizeChange(size: number) {
  pageSize.value = size
  page.value = 1
  loadList()
}

function openCreate() {
  createForm.name = ''
  createForm.description = ''
  createVisible.value = true
}

function openEdit(row: KnowledgeBase) {
  editForm.id = row.id
  editForm.name = row.name
  editForm.description = row.description ?? ''
  editVisible.value = true
}

async function handleCreate() {
  const valid = await createFormRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    await createKnowledgeApi({
      name: createForm.name.trim(),
      description: createForm.description.trim() || null,
    })
    ElMessage.success('创建成功')
    createVisible.value = false
    page.value = 1
    await loadList()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '创建失败')
  } finally {
    submitting.value = false
  }
}

async function handleUpdate() {
  const valid = await editFormRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    await updateKnowledgeApi({
      id: editForm.id,
      name: editForm.name.trim(),
      description: editForm.description.trim() || null,
    })
    ElMessage.success('更新成功')
    editVisible.value = false
    await loadList()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '更新失败')
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row: KnowledgeBase) {
  await ElMessageBox.confirm(`确定删除知识库「${row.name}」吗？删除后不可恢复。`, '提示', {
    type: 'warning',
  })
  try {
    await deleteKnowledgeApi(row.id)
    ElMessage.success('已删除')
    if (knowledgeBases.value.length === 1 && page.value > 1) {
      page.value -= 1
    }
    await loadList()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '删除失败')
  }
}

onMounted(async () => {
  await loadModuleStatus()
  await loadList()
})
</script>

<template>
  <AppLayout>
    <div class="knowledge-page page-card">
      <div class="toolbar">
        <div class="toolbar-left">
          <el-button type="primary" @click="openCreate">新建知识库</el-button>
          <el-tag v-if="moduleStatus" type="success" effect="plain">模块：{{ moduleStatus }}</el-tag>
        </div>
        <div class="toolbar-right">
          <el-input
            v-model="keyword"
            clearable
            placeholder="按名称搜索"
            style="width: 220px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
          <el-button @click="handleSearch">搜索</el-button>
        </div>
      </div>

      <el-table v-loading="loading" :data="knowledgeBases" empty-text="暂无知识库，点击上方新建">
        <el-table-column prop="name" label="知识库名称" min-width="180" />
        <el-table-column prop="description" label="描述" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.description || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :current-page="page"
          :page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </div>

    <el-dialog v-model="createVisible" title="新建知识库" width="480px" destroy-on-close>
      <el-form ref="createFormRef" :model="createForm" :rules="nameRules" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="createForm.name" maxlength="200" show-word-limit placeholder="请输入知识库名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="createForm.description"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit
            placeholder="可选，简要说明用途"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreate">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="editVisible" title="编辑知识库" width="480px" destroy-on-close>
      <el-form ref="editFormRef" :model="editForm" :rules="nameRules" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="editForm.name" maxlength="200" show-word-limit placeholder="请输入知识库名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="editForm.description"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit
            placeholder="可选，留空则清空描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleUpdate">保存</el-button>
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
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
