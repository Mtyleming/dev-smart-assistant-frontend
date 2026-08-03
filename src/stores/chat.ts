import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ConversationListItem, ConversationMode } from '@/api/conversation'

export interface ChatMessage {
  id: string | number
  role: 'user' | 'assistant' | 'system'
  content: string
}

/** 对话状态：当前会话、消息列表、对话模式 */
export const useChatStore = defineStore('chat', () => {
  const conversationId = ref<number | null>(null)
  const conversations = ref<ConversationListItem[]>([])
  const messages = ref<ChatMessage[]>([])
  const mode = ref<ConversationMode>('qa')
  const streaming = ref(false)

  function setConversationId(id: number | null) {
    conversationId.value = id
  }

  function setConversations(list: ConversationListItem[]) {
    conversations.value = list
  }

  function addMessage(message: ChatMessage) {
    messages.value.push(message)
  }

  function setMessages(list: ChatMessage[]) {
    messages.value = list
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

  function setMode(next: ConversationMode) {
    mode.value = next
  }

  function resetConversation() {
    conversationId.value = null
    messages.value = []
  }

  return {
    conversationId,
    conversations,
    messages,
    mode,
    streaming,
    setConversationId,
    setConversations,
    addMessage,
    setMessages,
    updateLastAssistantContent,
    clearMessages,
    setMode,
    resetConversation,
  }
})
