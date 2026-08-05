<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules, UploadRawFile, UploadRequestOptions } from 'element-plus'
import AppLayout from '@/components/layout/AppLayout.vue'
import {
  pageKnowledgeApi,
  createKnowledgeApi,
  updateKnowledgeApi,
  deleteKnowledgeApi,
  getKnowledgeStatusApi,
  pageDocumentsApi,
  createDocumentApi,
  getDocumentByIdApi,
  deleteDocumentByIdApi,
  type KnowledgeBase,
  type KnowledgeDocument,
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

/** 文档管理抽屉 */
const docsVisible = ref(false)
const currentKb = ref<KnowledgeBase | null>(null)
const docsLoading = ref(false)
const documents = ref<KnowledgeDocument[]>([])
const docsTotal = ref(0)
const docsPage = ref(1)
const docsPageSize = ref(20)
const docsKeyword = ref('')
const uploading = ref(false)

/** 文档详情 */
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailDoc = ref<KnowledgeDocument | null>(null)

const ALLOWED_EXT = ['pdf', 'docx', 'md', 'txt']
const MAX_FILE_SIZE = 20 * 1024 * 1024

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

/** 文件大小可读化 */
function formatFileSize(bytes?: number | null) {
  if (bytes == null || Number.isNaN(bytes)) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/** 文档解析状态展示 */
function statusLabel(status?: string) {
  const map: Record<string, string> = {
    pending: '待处理',
    processing: '解析中',
    ready: '已就绪',
    success: '已就绪',
    completed: '已就绪',
    failed: '失败',
    error: '失败',
  }
  if (!status) return '-'
  return map[status.toLowerCase()] || status
}

function statusTagType(status?: string): 'info' | 'warning' | 'success' | 'danger' {
  const key = (status || '').toLowerCase()
  if (['ready', 'success', 'completed'].includes(key)) return 'success'
  if (['pending', 'processing'].includes(key)) return 'warning'
  if (['failed', 'error'].includes(key)) return 'danger'
  return 'info'
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

/** ---------- 文档管理 ---------- */

function openDocuments(row: KnowledgeBase) {
  currentKb.value = row
  docsKeyword.value = ''
  docsPage.value = 1
  docsPageSize.value = 20
  docsVisible.value = true
  loadDocuments()
}

async function loadDocuments() {
  if (!currentKb.value) return
  docsLoading.value = true
  try {
    const result = await pageDocumentsApi({
      kbId: currentKb.value.id,
      page: docsPage.value,
      pageSize: docsPageSize.value,
      keyword: docsKeyword.value.trim() || null,
    })
    documents.value = result.items
    docsTotal.value = result.total
    docsPage.value = result.page
  } catch (error) {
    documents.value = []
    docsTotal.value = 0
    ElMessage.error(error instanceof Error ? error.message : '加载文档失败')
  } finally {
    docsLoading.value = false
  }
}

function handleDocsSearch() {
  docsPage.value = 1
  loadDocuments()
}

function handleDocsPageChange(nextPage: number) {
  docsPage.value = nextPage
  loadDocuments()
}

function handleDocsSizeChange(size: number) {
  docsPageSize.value = size
  docsPage.value = 1
  loadDocuments()
}

/** 上传前校验：类型与大小 */
function beforeUpload(file: UploadRawFile) {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  if (!ALLOWED_EXT.includes(ext)) {
    ElMessage.error(`仅支持 ${ALLOWED_EXT.join(' / ')} 格式`)
    return false
  }
  if (file.size > MAX_FILE_SIZE) {
    ElMessage.error('文件不能超过 20MB')
    return false
  }
  return true
}

/** 自定义上传：走后端 createDocuments 接口 */
async function handleUpload(options: UploadRequestOptions) {
  if (!currentKb.value) {
    options.onError?.(new Error('未选择知识库') as never)
    return
  }
  uploading.value = true
  try {
    await createDocumentApi(currentKb.value.id, options.file as File)
    ElMessage.success('上传成功')
    options.onSuccess?.({})
    docsPage.value = 1
    await loadDocuments()
  } catch (error) {
    const message = error instanceof Error ? error.message : '上传失败'
    ElMessage.error(message)
    options.onError?.(error as never)
  } finally {
    uploading.value = false
  }
}

async function openDocDetail(row: KnowledgeDocument) {
  detailVisible.value = true
  detailLoading.value = true
  detailDoc.value = null
  try {
    detailDoc.value = await getDocumentByIdApi(row.id)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载文档详情失败')
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

async function handleDeleteDoc(row: KnowledgeDocument) {
  await ElMessageBox.confirm(`确定删除文档「${row.title}」吗？删除后不可恢复。`, '提示', {
    type: 'warning',
  })
  try {
    await deleteDocumentByIdApi(row.id)
    ElMessage.success('已删除')
    if (documents.value.length === 1 && docsPage.value > 1) {
      docsPage.value -= 1
    }
    await loadDocuments()
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
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openDocuments(row)">管理文档</el-button>
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

    <!-- 文档管理抽屉 -->
    <el-drawer
      v-model="docsVisible"
      :title="currentKb ? `文档管理 · ${currentKb.name}` : '文档管理'"
      size="720px"
      destroy-on-close
    >
      <div class="docs-toolbar">
        <el-upload
          :show-file-list="false"
          :before-upload="beforeUpload"
          :http-request="handleUpload"
          accept=".pdf,.docx,.md,.txt"
        >
          <el-button type="primary" :loading="uploading">上传文档</el-button>
        </el-upload>
        <span class="upload-hint">支持 pdf / docx / md / txt，最大 20MB</span>
        <div class="docs-search">
          <el-input
            v-model="docsKeyword"
            clearable
            placeholder="按标题搜索"
            style="width: 200px"
            @keyup.enter="handleDocsSearch"
            @clear="handleDocsSearch"
          />
          <el-button @click="handleDocsSearch">搜索</el-button>
        </div>
      </div>

      <el-table v-loading="docsLoading" :data="documents" empty-text="暂无文档，点击上方上传">
        <el-table-column prop="title" label="标题" min-width="160" show-overflow-tooltip />
        <el-table-column prop="fileType" label="类型" width="80" />
        <el-table-column label="大小" width="100">
          <template #default="{ row }">
            {{ formatFileSize(row.fileSize) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small" effect="plain">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="上传时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openDocDetail(row)">详情</el-button>
            <el-button type="danger" link size="small" @click="handleDeleteDoc(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next"
          :total="docsTotal"
          :current-page="docsPage"
          :page-size="docsPageSize"
          :page-sizes="[10, 20, 50]"
          @current-change="handleDocsPageChange"
          @size-change="handleDocsSizeChange"
        />
      </div>
    </el-drawer>

    <!-- 文档详情 -->
    <el-dialog v-model="detailVisible" title="文档详情" width="640px" destroy-on-close>
      <div v-loading="detailLoading" class="doc-detail">
        <template v-if="detailDoc">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="标题">{{ detailDoc.title }}</el-descriptions-item>
            <el-descriptions-item label="类型">{{ detailDoc.fileType }}</el-descriptions-item>
            <el-descriptions-item label="大小">{{ formatFileSize(detailDoc.fileSize) }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="statusTagType(detailDoc.status)" size="small" effect="plain">
                {{ statusLabel(detailDoc.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="路径">{{ detailDoc.filePath || '-' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatTime(detailDoc.createdAt) }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ formatTime(detailDoc.updatedAt) }}</el-descriptions-item>
          </el-descriptions>
          <div v-if="detailDoc.fullText" class="full-text-block">
            <div class="full-text-title">解析文本预览</div>
            <pre class="full-text">{{ detailDoc.fullText }}</pre>
          </div>
          <el-empty v-else description="暂无解析文本" :image-size="64" />
        </template>
      </div>
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

.docs-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.upload-hint {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.docs-search {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.doc-detail {
  min-height: 120px;
}

.full-text-block {
  margin-top: 16px;
}

.full-text-title {
  font-weight: 600;
  margin-bottom: 8px;
}

.full-text {
  max-height: 320px;
  overflow: auto;
  padding: 12px;
  margin: 0;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  line-height: 1.6;
}
</style>
