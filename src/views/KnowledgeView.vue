<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadRequestOptions } from 'element-plus'
import AppLayout from '@/components/layout/AppLayout.vue'
import { fetchKnowledgeListApi, createKnowledgeApi, deleteKnowledgeApi, type KnowledgeBase } from '@/api/knowledge'

const loading = ref(false)
const knowledgeBases = ref<KnowledgeBase[]>([])
const selectedRows = ref<KnowledgeBase[]>([])
const createVisible = ref(false)
const newName = ref('')

/** 演示数据：后端未就绪时用于页面展示 */
const demoData: KnowledgeBase[] = [
  { id: 1, name: '产品需求文档库', docCount: 12, updatedAt: '2026-07-28' },
  { id: 2, name: '前端开发规范', docCount: 8, updatedAt: '2026-07-27' },
  { id: 3, name: '接口设计说明', docCount: 21, updatedAt: '2026-07-26' },
]

async function loadList() {
  loading.value = true
  try {
    knowledgeBases.value = await fetchKnowledgeListApi()
  } catch {
    knowledgeBases.value = [...demoData]
    ElMessage.warning('知识库接口不可用，已加载演示数据')
  } finally {
    loading.value = false
  }
}

function handleSelectionChange(rows: KnowledgeBase[]) {
  selectedRows.value = rows
}

async function handleCreate() {
  if (!newName.value.trim()) {
    ElMessage.warning('请输入知识库名称')
    return
  }

  try {
    await createKnowledgeApi(newName.value.trim())
    ElMessage.success('创建成功')
  } catch {
    // 本地演示：直接插入列表
    knowledgeBases.value.unshift({
      id: Date.now(),
      name: newName.value.trim(),
      docCount: 0,
      updatedAt: new Date().toISOString().slice(0, 10),
    })
    ElMessage.success('已在本地演示中创建')
  }

  createVisible.value = false
  newName.value = ''
}

async function handleDelete(row: KnowledgeBase) {
  await ElMessageBox.confirm(`确定删除知识库「${row.name}」吗？`, '提示', { type: 'warning' })
  try {
    await deleteKnowledgeApi(row.id)
  } catch {
    // 忽略后端错误，继续本地删除演示
  }
  knowledgeBases.value = knowledgeBases.value.filter((item) => item.id !== row.id)
  ElMessage.success('已删除')
}

/** 自定义上传：后续对接真实上传接口 */
async function customUpload(options: UploadRequestOptions) {
  const file = options.file
  ElMessage.success(`已选择文件：${file.name}（待对接上传接口）`)
  options.onSuccess?.({} as never)
}

onMounted(loadList)
</script>

<template>
  <AppLayout>
    <div class="knowledge-page page-card">
      <div class="toolbar">
        <div>
          <el-button type="primary" @click="createVisible = true">新建知识库</el-button>
          <el-tag v-if="selectedRows.length" class="selected-tip" type="info">
            已选中 {{ selectedRows.length }} 个知识库
          </el-tag>
        </div>
        <el-upload :show-file-list="false" :http-request="customUpload" accept=".pdf,.doc,.docx,.md,.txt">
          <el-button>上传文档</el-button>
        </el-upload>
      </div>

      <el-table
        v-loading="loading"
        :data="knowledgeBases"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column prop="name" label="知识库名称" min-width="180" />
        <el-table-column prop="docCount" label="文档数量" width="120" />
        <el-table-column prop="updatedAt" label="更新时间" width="140" />
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button type="primary" link size="small">管理文档</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="createVisible" title="新建知识库" width="420px">
      <el-input v-model="newName" placeholder="请输入知识库名称" maxlength="50" show-word-limit />
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreate">确定</el-button>
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
}

.selected-tip {
  margin-left: 12px;
}
</style>
