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
