import http from '@/utils/http'
import { useUserStore } from '@/stores/user'

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

/** SSE 流式对话过程中的回调 */
export interface StreamChatHandlers {
  /** 后端创建/确认会话 ID（首次对话会推送） */
  onConversation?: (conversationId: number) => void
  /** 用户消息已落库 */
  onUserMsg?: (msg: ChatMessageItem) => void
  /** 助手增量文本 */
  onDelta?: (content: string) => void
  /** 助手消息完整落库 */
  onAssistantMsg?: (msg: ChatMessageItem) => void
  /** 流正常结束 */
  onDone?: () => void
}

/**
 * 解析 SSE 文本缓冲，按完整事件切分。
 * 返回：已解析事件列表 + 未完整的残余缓冲。
 */
function consumeSseBuffer(buffer: string): { events: Array<{ event: string; data: string }>; rest: string } {
  const events: Array<{ event: string; data: string }> = []
  const parts = buffer.split('\n\n')
  const rest = parts.pop() ?? ''

  for (const part of parts) {
    const lines = part.split('\n')
    let eventName = 'message'
    const dataLines: string[] = []
    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim()
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim())
      }
    }
    if (dataLines.length > 0) {
      events.push({ event: eventName, data: dataLines.join('\n') })
    }
  }

  return { events, rest }
}

function parseJsonSafe<T>(raw: string): T | null {
  if (!raw || raw === 'null') return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

async function readHttpErrorMessage(response: Response): Promise<string> {
  try {
    const text = await response.text()
    const json = parseJsonSafe<{ message?: string; detail?: unknown }>(text)
    if (json?.message) return json.message
    if (typeof json?.detail === 'string') return json.detail
    if (text) return text.slice(0, 200)
  } catch {
    // ignore
  }
  return `流式请求失败: ${response.status}`
}

/**
 * 发起 SSE 流式对话：POST /messages/chat
 * 事件顺序通常为：conversation → user_msg → delta* → assistant_msg → done
 * 业务错误可能以 event:error 推送；HTTP 4xx/5xx 为 JSON。
 */
export async function streamChatMessageApi(
  data: ChatRequest,
  handlers: StreamChatHandlers = {},
  signal?: AbortSignal,
): Promise<ChatResponseData> {
  const userStore = useUserStore()
  const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

  const payload: ChatRequest = { content: data.content }
  if (data.content_type) payload.content_type = data.content_type
  if (data.conversation_id != null) payload.conversation_id = data.conversation_id

  const response = await fetch(`${baseURL}/messages/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(userStore.token ? { Authorization: `Bearer ${userStore.token}` } : {}),
    },
    body: JSON.stringify(payload),
    signal,
  })

  if (!response.ok) {
    throw new Error(await readHttpErrorMessage(response))
  }
  if (!response.body) {
    throw new Error('浏览器不支持流式响应')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let conversationId: number | undefined
  let userMsg: ChatMessageItem | null = null
  let assistantMsg: ChatMessageItem | null = null
  let assistantContent = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const { events, rest } = consumeSseBuffer(buffer)
    buffer = rest

    for (const evt of events) {
      if (evt.event === 'conversation') {
        const parsed = parseJsonSafe<{ conversation_id: number }>(evt.data)
        if (parsed?.conversation_id != null) {
          conversationId = parsed.conversation_id
          handlers.onConversation?.(conversationId)
        }
        continue
      }

      if (evt.event === 'user_msg') {
        const parsed = parseJsonSafe<ChatMessageItem>(evt.data)
        if (parsed) {
          userMsg = parsed
          handlers.onUserMsg?.(parsed)
        }
        continue
      }

      if (evt.event === 'delta') {
        const parsed = parseJsonSafe<{ content?: string }>(evt.data)
        const chunk = parsed?.content ?? ''
        if (chunk) {
          assistantContent += chunk
          handlers.onDelta?.(chunk)
        }
        continue
      }

      if (evt.event === 'assistant_msg') {
        const parsed = parseJsonSafe<ChatMessageItem>(evt.data)
        if (parsed) {
          assistantMsg = parsed
          assistantContent = parsed.content
          handlers.onAssistantMsg?.(parsed)
        }
        continue
      }

      if (evt.event === 'error') {
        const parsed = parseJsonSafe<{ code?: number; message?: string }>(evt.data)
        throw new Error(parsed?.message || '对话失败')
      }

      if (evt.event === 'done') {
        handlers.onDone?.()
      }
    }
  }

  if (!userMsg || !assistantMsg) {
    throw new Error('对话未完整返回，请稍后重试')
  }

  return {
    user_msg: userMsg,
    assistant_msg: assistantMsg,
    conversation_id: conversationId ?? userMsg.conversation_id ?? assistantMsg.conversation_id,
  }
}

/** @deprecated 请使用 streamChatMessageApi；保留仅为兼容旧调用 */
export function sendChatMessageApi(data: ChatRequest) {
  return streamChatMessageApi(data)
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
