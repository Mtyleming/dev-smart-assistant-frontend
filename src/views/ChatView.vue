<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { ElMessage } from 'element-plus'
import AppLayout from '@/components/layout/AppLayout.vue'
import MessageBubble from '@/components/MessageBubble.vue'
import { useChatStore } from '@/stores/chat'
import { streamChatApi } from '@/api/chat'
import { createId } from '@/utils/markdown'

const chatStore = useChatStore()
const inputText = ref('')
const listRef = ref<HTMLElement | null>(null)
let abortController: AbortController | null = null

const canSend = computed(
  () => inputText.value.trim().length > 0 && !chatStore.streaming,
)

async function scrollToBottom() {
  await nextTick()
  if (listRef.value) {
    listRef.value.scrollTop = listRef.value.scrollHeight
  }
}

async function sendQuestion() {
  if (!canSend.value) return

  const content = inputText.value.trim()
  inputText.value = ''

  chatStore.addMessage({
    id: createId('user'),
    role: 'user',
    content,
  })

  const assistantId = createId('assistant')
  chatStore.addMessage({
    id: assistantId,
    role: 'assistant',
    content: '',
  })
  chatStore.streaming = true
  await scrollToBottom()

  abortController = new AbortController()

  try {
    let assembled = ''
    await streamChatApi(
      {
        conversationId: chatStore.conversationId || undefined,
        content,
        mode: chatStore.mode,
      },
      (chunk) => {
        assembled += chunk
        chatStore.updateLastAssistantContent(assembled)
        scrollToBottom()
      },
      abortController.signal,
    )
  } catch (error) {
    // 后端未就绪时给出本地演示回复，保证页面可演示
    const demo = [
      '（演示回复）后端流式接口暂未连通。',
      '',
      '你刚才问的是：',
      '',
      `> ${content}`,
      '',
      '示例代码：',
      '',
      '```ts',
      'console.log("Hello, Smart Assistant")',
      '```',
    ].join('\n')
    chatStore.updateLastAssistantContent(demo)
    ElMessage.warning('流式接口不可用，已展示本地演示回复')
    console.warn('[ChatView] stream failed:', error)
  } finally {
    chatStore.streaming = false
    abortController = null
    await scrollToBottom()
  }
}

function stopStreaming() {
  abortController?.abort()
  chatStore.streaming = false
}

function clearChat() {
  chatStore.clearMessages()
}
</script>

<template>
  <AppLayout>
    <div class="chat-page page-card">
      <div class="toolbar">
        <el-radio-group v-model="chatStore.mode" size="small">
          <el-radio-button value="knowledge">知识库问答</el-radio-button>
          <el-radio-button value="general">通用对话</el-radio-button>
        </el-radio-group>
        <el-button size="small" @click="clearChat">清空对话</el-button>
      </div>

      <div ref="listRef" class="message-list">
        <el-empty v-if="!chatStore.messages.length" description="开始提问吧，支持 Markdown 与代码高亮" />
        <MessageBubble v-for="msg in chatStore.messages" :key="msg.id" :message="msg" />
      </div>

      <div class="composer">
        <el-input
          v-model="inputText"
          type="textarea"
          :rows="3"
          resize="none"
          placeholder="请输入问题，Enter 发送（Shift+Enter 换行）"
          @keydown.enter.exact.prevent="sendQuestion"
        />
        <div class="composer-actions">
          <el-button v-if="chatStore.streaming" @click="stopStreaming">停止</el-button>
          <el-button type="primary" :disabled="!canSend" :loading="chatStore.streaming" @click="sendQuestion">
            发送
          </el-button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped lang="scss">
.chat-page {
  height: calc(100vh - var(--app-header-height) - var(--app-content-padding) * 2);
  display: flex;
  flex-direction: column;
  min-height: 480px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.message-list {
  flex: 1;
  overflow: auto;
  padding: 8px 4px 16px;
}

.composer {
  border-top: 1px solid #ebeef5;
  padding-top: 12px;
}

.composer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}
</style>
