import http from '@/utils/http'

/** 对话模式 */
export type ConversationMode = 'qa' | 'code' | 'doc'

/** 对话列表查询范围 */
export type ConversationListScope = 'mine' | 'team'

export interface ConversationListItem {
  id: number
  title: string
  mode: ConversationMode
  createdAt: string
  updatedAt: string
  userId?: number | null
  username?: string | null
}

export interface ConversationDetail {
  id: number
  title: string
  mode: ConversationMode
  createdAt: string
  updatedAt: string
}

export interface ConversationListResult {
  items: ConversationListItem[]
  total: number
  page: number
}

export interface ConversationMessage {
  id: number
  role: 'user' | 'assistant' | 'system' | string
  content: string
  createdAt?: string
}

interface ConversationListItemRaw {
  id: number
  title: string
  mode: ConversationMode
  created_at: string
  updated_at: string
  user_id?: number | null
  username?: string | null
}

interface ConversationDetailRaw {
  id: number
  title: string
  mode: ConversationMode
  created_at: string
  updated_at: string
}

interface ConversationListResultRaw {
  items: ConversationListItemRaw[]
  total: number
  page: number
}

interface ConversationMessageRaw {
  id: number
  role: string
  content: string
  created_at?: string
}

function mapListItem(raw: ConversationListItemRaw): ConversationListItem {
  return {
    id: raw.id,
    title: raw.title,
    mode: raw.mode,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    userId: raw.user_id,
    username: raw.username,
  }
}

function mapDetail(raw: ConversationDetailRaw): ConversationDetail {
  return {
    id: raw.id,
    title: raw.title,
    mode: raw.mode,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

function mapMessage(raw: ConversationMessageRaw): ConversationMessage {
  return {
    id: raw.id,
    role: raw.role,
    content: raw.content,
    createdAt: raw.created_at,
  }
}

export interface ListConversationsParams {
  page?: number
  page_size?: number
  title?: string
  mode?: ConversationMode
  scope?: ConversationListScope
  username?: string
}

export const CONVERSATION_MODE_OPTIONS: Array<{ value: ConversationMode; label: string }> = [
  { value: 'qa', label: '智能问答' },
  { value: 'code', label: '代码辅助' },
  { value: 'doc', label: '文档生成' },
]

export function conversationModeLabel(mode: string) {
  return CONVERSATION_MODE_OPTIONS.find((m) => m.value === mode)?.label ?? mode
}

/** 模块状态 */
export function getConversationsStatusApi() {
  return http.get<unknown, { module: string; status: string; detail?: unknown }>(
    '/conversations/status',
  )
}

/** 创建对话 */
export function createConversationApi(mode: ConversationMode) {
  return http.post<{ mode: ConversationMode }, ConversationDetailRaw>('/conversations', { mode }).then(
    mapDetail,
  )
}

/** 分页获取对话列表 */
export async function listConversationsApi(params: ListConversationsParams = {}) {
  const raw = await http.get<ListConversationsParams, ConversationListResultRaw>(
    '/conversations',
    { params },
  )
  return {
    items: raw.items.map(mapListItem),
    total: raw.total,
    page: raw.page,
  } satisfies ConversationListResult
}

/** 获取对话详情 */
export function getConversationApi(conversationId: number) {
  return http
    .get<unknown, ConversationDetailRaw>(`/conversations/${conversationId}`)
    .then(mapDetail)
}

/** 删除对话 */
export function deleteConversationApi(conversationId: number) {
  return http.delete<unknown, null>(`/conversations/${conversationId}`)
}

/** 修改对话标题 */
export function updateConversationTitleApi(conversationId: number, title: string) {
  return http.put<{ title: string }, null>(`/conversations/${conversationId}/title`, { title })
}

/** 获取对话消息列表 */
export async function listMessagesApi(conversationId: number, page = 1, pageSize = 100) {
  const raw = await http.post<
    { conversationId: number; page: number; pageSize: number },
    { items: ConversationMessageRaw[]; total: number; page: number }
  >('/messages/getMessageList', { conversationId, page, pageSize })
  return raw.items.map(mapMessage)
}
