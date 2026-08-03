import http from '@/utils/http'

export type MessageContentType = 'text' | 'code'

export interface ChatMessageItem {
  id: number
  role: string
  content: string
  content_type: string
  created_at: string
  conversation_id?: number
}

export interface ChatRequest {
  content: string
  content_type?: MessageContentType
  conversation_id?: number | null
}

export interface ChatResponseData {
  user_msg: ChatMessageItem
  assistant_msg: ChatMessageItem
  conversation_id?: number
}

export interface MessageListRequest {
  conversationId: number
  page?: number
  pageSize?: number
}

export interface MessageListItem {
  id: number
  role: string
  content: string
  content_type: string
  created_at: string
}

export interface MessageListResult {
  items: MessageListItem[]
  total: number
  page: number
}

/** 发起对话：首次可不传 conversation_id，后端自动创建会话 */
export function sendChatMessageApi(data: ChatRequest) {
  const payload: ChatRequest = { content: data.content }
  if (data.content_type) {
    payload.content_type = data.content_type
  }
  if (data.conversation_id != null) {
    payload.conversation_id = data.conversation_id
  }
  return http.post<ChatRequest, ChatResponseData>('/messages/chat', payload)
}

/** 分页获取指定对话的历史消息 */
export async function getMessageListApi(params: MessageListRequest) {
  return http.post<MessageListRequest, MessageListResult>('/messages/getMessageList', {
    conversationId: params.conversationId,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 100,
  })
}

export function resolveConversationIdFromChatResponse(data: ChatResponseData): number | null {
  if (data.conversation_id != null) return data.conversation_id
  if (data.user_msg.conversation_id != null) return data.user_msg.conversation_id
  if (data.assistant_msg.conversation_id != null) return data.assistant_msg.conversation_id
  return null
}
