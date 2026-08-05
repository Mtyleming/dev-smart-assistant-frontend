import http from '@/utils/http'
import type { ModuleStatus } from '@/api/team'

/** 知识库列表/详情项（前端 camelCase） */
export interface KnowledgeBase {
  id: number
  name: string
  description: string | null
  teamId: number
  createdBy: number
  createdAt: string
  updatedAt: string
}

/** 分页列表结果 */
export interface KnowledgePageResult {
  items: KnowledgeBase[]
  total: number
  page: number
}

/** 后端原始列表项（snake_case） */
interface KnowledgeItemRaw {
  id: number
  name: string
  description: string | null
  team_id: number
  created_by: number
  created_at: string
  updated_at: string
}

interface KnowledgePageRaw {
  items: KnowledgeItemRaw[]
  total: number
  page: number
}

export interface KnowledgePageParams {
  page?: number
  pageSize?: number
  keyword?: string | null
}

export interface KnowledgeCreatePayload {
  name: string
  description?: string | null
}

export interface KnowledgeUpdatePayload {
  id: number
  name?: string | null
  description?: string | null
}

function mapKnowledgeItem(raw: KnowledgeItemRaw): KnowledgeBase {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    teamId: raw.team_id,
    createdBy: raw.created_by,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

/** 知识库模块状态（联调探活） */
export function getKnowledgeStatusApi() {
  return http.get<unknown, ModuleStatus>('/knowledge-bases/status')
}

/** 分页查询知识库列表 */
export async function pageKnowledgeApi(params: KnowledgePageParams = {}) {
  const raw = await http.post<KnowledgePageParams, KnowledgePageRaw>('/knowledge-bases/page', {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    keyword: params.keyword ?? null,
  })
  return {
    items: (raw.items ?? []).map(mapKnowledgeItem),
    total: raw.total,
    page: raw.page,
  } satisfies KnowledgePageResult
}

/** 按 ID 查询知识库详情 */
export function getKnowledgeByIdApi(id: number) {
  return http
    .post<{ id: number }, KnowledgeItemRaw>('/knowledge-bases/getById', { id })
    .then(mapKnowledgeItem)
}

/** 创建知识库，返回新建 ID */
export function createKnowledgeApi(data: KnowledgeCreatePayload) {
  return http.post<KnowledgeCreatePayload, { id: number }>('/knowledge-bases/create', data)
}

/** 更新知识库（至少传 name 或 description） */
export function updateKnowledgeApi(data: KnowledgeUpdatePayload) {
  return http.post<KnowledgeUpdatePayload, null>('/knowledge-bases/update', data)
}

/** 删除知识库 */
export function deleteKnowledgeApi(id: number) {
  return http.post<{ id: number }, null>('/knowledge-bases/delete', { id })
}

/** 知识库文档（前端 camelCase） */
export interface KnowledgeDocument {
  id: number
  knowledgeBaseId: number
  title: string
  fileType: string
  filePath: string
  fileSize: number
  status: string
  fullText: string | null
  createdAt: string
  updatedAt: string
}

/** 文档分页结果 */
export interface DocumentPageResult {
  items: KnowledgeDocument[]
  total: number
  page: number
}

/** 后端原始文档项（snake_case） */
interface DocumentItemRaw {
  id: number
  knowledge_base_id: number
  title: string
  file_type: string
  file_path: string
  file_size: number
  status: string
  full_text?: string | null
  created_at: string
  updated_at: string
}

interface DocumentPageRaw {
  items: DocumentItemRaw[]
  total: number
  page: number
}

export interface DocumentPageParams {
  kbId: number
  page?: number
  pageSize?: number
  keyword?: string | null
}

function mapDocumentItem(raw: DocumentItemRaw): KnowledgeDocument {
  return {
    id: raw.id,
    knowledgeBaseId: raw.knowledge_base_id,
    title: raw.title,
    fileType: raw.file_type,
    filePath: raw.file_path,
    fileSize: raw.file_size,
    status: raw.status,
    fullText: raw.full_text ?? null,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

/** 上传文档（multipart：kb_id + file），支持 pdf / docx / md / txt，最大 20MB */
export function createDocumentApi(kbId: number, file: File) {
  const formData = new FormData()
  formData.append('kb_id', String(kbId))
  formData.append('file', file)
  // 不要手动写 Content-Type，让浏览器自动带 multipart boundary
  return http.post<FormData, { id: number }>('/knowledge-bases/createDocuments', formData, {
    timeout: 120000,
  })
}

/** 分页查询知识库下的文档 */
export async function pageDocumentsApi(params: DocumentPageParams) {
  const raw = await http.post<
    { kb_id: number; page: number; pageSize: number; keyword: string | null },
    DocumentPageRaw
  >('/knowledge-bases/pageDocuments', {
    kb_id: params.kbId,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    keyword: params.keyword ?? null,
  })
  return {
    items: (raw.items ?? []).map(mapDocumentItem),
    total: raw.total,
    page: raw.page,
  } satisfies DocumentPageResult
}

/** 按 ID 查询文档详情 */
export function getDocumentByIdApi(documentId: number) {
  return http
    .post<{ document_id: number }, DocumentItemRaw>('/knowledge-bases/getDocumentById', {
      document_id: documentId,
    })
    .then(mapDocumentItem)
}

/** 删除文档 */
export function deleteDocumentByIdApi(documentId: number) {
  return http.post<{ document_id: number }, null>('/knowledge-bases/deleteDocumentById', {
    document_id: documentId,
  })
}
