import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
}

/** 对话状态：当前会话、消息列表、对话模式 */
export const useChatStore = defineStore('chat', () => {
  const conversationId = ref<string>('')
  const messages = ref<ChatMessage[]>([])
  /** 对话模式：knowledge=知识库问答，general=通用对话 */
  const mode = ref<'knowledge' | 'general'>('knowledge')
  const streaming = ref(false)

  function setConversationId(id: string) {
    conversationId.value = id
  }

  function addMessage(message: ChatMessage) {
    messages.value.push(message)
  }

  function updateLastAssistantContent(content: string) {
    const last = [...messages.value].reverse().find((m) => m.role === 'assistant')
    if (last) {
      last.content = content
    }
  }

  function clearMessages() {
    messages.value = []
  }

  function setMode(next: 'knowledge' | 'general') {
    mode.value = next
  }

  return {
    conversationId,
    messages,
    mode,
    streaming,
    setConversationId,
    addMessage,
    updateLastAssistantContent,
    clearMessages,
    setMode,
  }
})
