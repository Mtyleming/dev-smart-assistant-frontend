import http from '@/utils/http'
import { useUserStore } from '@/stores/user'

export interface SendMessagePayload {
  conversationId?: string
  content: string
  mode: 'knowledge' | 'general'
}

/** 非流式发送消息（普通问答） */
export function sendMessageApi(data: SendMessagePayload) {
  return http.post('/chat/messages', data)
}

/**
 * 流式对话：使用原生 fetch + ReadableStream
 * 大模型逐字输出不走 Axios，便于精确控制流式数据
 */
export async function streamChatApi(
  data: SendMessagePayload,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
) {
  const userStore = useUserStore()
  const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

  const response = await fetch(`${baseURL}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userStore.token ? { Authorization: `Bearer ${userStore.token}` } : {}),
    },
    body: JSON.stringify(data),
    signal,
  })

  if (!response.ok || !response.body) {
    throw new Error(`流式请求失败: ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    onChunk(decoder.decode(value, { stream: true }))
  }
}
