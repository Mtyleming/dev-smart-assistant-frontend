<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppLayout from '@/components/layout/AppLayout.vue'
import MessageBubble from '@/components/MessageBubble.vue'
import { useChatStore } from '@/stores/chat'
import {
  resolveConversationIdFromChatResponse,
  sendChatMessageApi,
  type MessageContentType,
} from '@/api/message'
import {
  CONVERSATION_MODE_OPTIONS,
  conversationModeLabel,
  createConversationApi,
  deleteConversationApi,
  listConversationsApi,
  listMessagesApi,
  updateConversationTitleApi,
  type ConversationMode,
} from '@/api/conversation'
import { createId } from '@/utils/markdown'

const chatStore = useChatStore()
const inputText = ref('')
const listRef = ref<HTMLElement | null>(null)
const sidebarLoading = ref(false)
const messagesLoading = ref(false)
const creating = ref(false)
const titleVisible = ref(false)
const titleInput = ref('')
const editingId = ref<number | null>(null)

const canSend = computed(
  () => inputText.value.trim().length > 0 && !chatStore.streaming && !messagesLoading.value,
)

const currentTitle = computed(() => {
  const current = chatStore.conversations.find((c) => c.id === chatStore.conversationId)
  return current?.title || '新对话'
})

async function scrollToBottom() {
  await nextTick()
  if (listRef.value) {
    listRef.value.scrollTop = listRef.value.scrollHeight
  }
}

async function loadConversations() {
  sidebarLoading.value = true
  try {
    const result = await listConversationsApi({ page: 1, page_size: 100, scope: 'mine' })
    chatStore.setConversations(result.items)
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '加载对话列表失败')
  } finally {
    sidebarLoading.value = false
  }
}

async function loadMessages(conversationId: number) {
  messagesLoading.value = true
  try {
    const msgs = await listMessagesApi(conversationId)
    chatStore.setMessages(
      msgs.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
    )
    await scrollToBottom()
  } catch (err) {
    chatStore.clearMessages()
    ElMessage.error(err instanceof Error ? err.message : '加载消息失败')
  } finally {
    messagesLoading.value = false
  }
}

async function selectConversation(id: number) {
  if (chatStore.conversationId === id) return
  chatStore.setConversationId(id)
  const item = chatStore.conversations.find((c) => c.id === id)
  if (item) {
    chatStore.setMode(item.mode)
  }
  await loadMessages(id)
}

function applyConversationSelection(id: number) {
  chatStore.setConversationId(id)
  const item = chatStore.conversations.find((c) => c.id === id)
  if (item) {
    chatStore.setMode(item.mode)
  }
}

function contentTypeByMode(mode: ConversationMode): MessageContentType {
  return mode === 'code' ? 'code' : 'text'
}

async function handleCreate(mode: ConversationMode) {
  creating.value = true
  try {
    const created = await createConversationApi(mode)
    await loadConversations()
    chatStore.setConversationId(created.id)
    chatStore.setMode(created.mode)
    chatStore.clearMessages()
    ElMessage.success('已创建新对话')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '创建对话失败')
  } finally {
    creating.value = false
  }
}

async function handleDelete(item: { id: number; title: string }) {
  await ElMessageBox.confirm(`确定删除对话「${item.title}」吗？`, '删除对话', { type: 'warning' })
  try {
    await deleteConversationApi(item.id)
    if (chatStore.conversationId === item.id) {
      chatStore.resetConversation()
    }
    await loadConversations()
    ElMessage.success('对话已删除')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '删除失败')
  }
}

function openRename(item: { id: number; title: string }) {
  editingId.value = item.id
  titleInput.value = item.title
  titleVisible.value = true
}

async function saveTitle() {
  const title = titleInput.value.trim()
  if (!title || !editingId.value) return
  try {
    await updateConversationTitleApi(editingId.value, title)
    const target = chatStore.conversations.find((c) => c.id === editingId.value)
    if (target) target.title = title
    titleVisible.value = false
    ElMessage.success('标题已更新')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '更新标题失败')
  }
}

async function sendQuestion() {
  if (!canSend.value) return

  const content = inputText.value.trim()
  inputText.value = ''
  const isNewConversation = chatStore.conversationId == null
  const activeConversationId = chatStore.conversationId

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

  try {
    const result = await sendChatMessageApi({
      content,
      content_type: contentTypeByMode(chatStore.mode),
      conversation_id: activeConversationId ?? undefined,
    })

    const userMessage = chatStore.messages[chatStore.messages.length - 2]
    const assistantMessage = chatStore.messages[chatStore.messages.length - 1]
    if (userMessage) {
      userMessage.id = result.user_msg.id
      userMessage.content = result.user_msg.content
    }
    if (assistantMessage) {
      assistantMessage.id = result.assistant_msg.id
      assistantMessage.content = result.assistant_msg.content
    }

    await loadConversations()

    if (isNewConversation) {
      const newConversationId =
        resolveConversationIdFromChatResponse(result) ?? chatStore.conversations[0]?.id ?? null
      if (newConversationId != null) {
        applyConversationSelection(newConversationId)
      }
    }
  } catch (error) {
    chatStore.messages.splice(-2, 2)
    ElMessage.error(error instanceof Error ? error.message : '发送消息失败')
    console.warn('[ChatView] send message failed:', error)
  } finally {
    chatStore.streaming = false
    await scrollToBottom()
  }
}

function formatTime(value: string) {
  try {
    return new Date(value).toLocaleString('zh-CN')
  } catch {
    return value
  }
}

onMounted(loadConversations)
</script>

<template>
  <AppLayout>
    <div class="chat-page page-card">
      <aside class="conv-sidebar" v-loading="sidebarLoading">
        <div class="sidebar-header">
          <span>我的对话</span>
          <el-dropdown trigger="click" @command="handleCreate">
            <el-button type="primary" size="small" :loading="creating">新对话</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="opt in CONVERSATION_MODE_OPTIONS"
                  :key="opt.value"
                  :command="opt.value"
                >
                  {{ opt.label }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
        <div class="conv-list">
          <el-empty v-if="!sidebarLoading && chatStore.conversations.length === 0" description="暂无对话" />
          <div
            v-for="item in chatStore.conversations"
            :key="item.id"
            class="conv-item"
            :class="{ active: chatStore.conversationId === item.id }"
            @click="selectConversation(item.id)"
          >
            <div class="conv-title">{{ item.title }}</div>
            <div class="conv-meta">
              <el-tag size="small" type="info">{{ conversationModeLabel(item.mode) }}</el-tag>
              <span class="time">{{ formatTime(item.updatedAt) }}</span>
            </div>
            <div class="conv-actions">
              <el-button type="primary" link size="small" @click.stop="openRename(item)">改名</el-button>
              <el-button type="danger" link size="small" @click.stop="handleDelete(item)">删除</el-button>
            </div>
          </div>
        </div>
      </aside>

      <div class="chat-main">
        <div class="toolbar">
          <div class="title-area">
            <h3>{{ currentTitle }}</h3>
            <el-radio-group v-if="chatStore.conversationId" v-model="chatStore.mode" size="small" disabled>
              <el-radio-button
                v-for="opt in CONVERSATION_MODE_OPTIONS"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </el-radio-button>
            </el-radio-group>
          </div>
          <el-button size="small" @click="loadConversations">刷新列表</el-button>
        </div>

        <div ref="listRef" class="message-list" v-loading="messagesLoading">
          <el-empty
            v-if="!messagesLoading && !chatStore.messages.length"
            description="选择或创建对话后开始提问，支持 Markdown 与代码高亮"
          />
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
            <el-button type="primary" :disabled="!canSend" :loading="chatStore.streaming" @click="sendQuestion">
              发送
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="titleVisible" title="修改对话标题" width="400px">
      <el-input v-model="titleInput" placeholder="1-200 个字符" maxlength="200" />
      <template #footer>
        <el-button @click="titleVisible = false">取消</el-button>
        <el-button type="primary" @click="saveTitle">保存</el-button>
      </template>
    </el-dialog>
  </AppLayout>
</template>

<style scoped lang="scss">
.chat-page {
  height: calc(100vh - var(--app-header-height) - var(--app-content-padding) * 2);
  display: flex;
  min-height: 480px;
  gap: 0;
  padding: 0;
  overflow: hidden;
}

.conv-sidebar {
  width: 280px;
  border-right: 1px solid #ebeef5;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid #ebeef5;
  font-weight: 600;
}

.conv-list {
  flex: 1;
  overflow: auto;
  padding: 8px;
}

.conv-item {
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  margin-bottom: 6px;
  transition: background 0.15s;

  &:hover {
    background: #f5f7fa;
  }

  &.active {
    background: #ecf5ff;
    border-color: #d9ecff;
  }
}

.conv-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conv-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;

  .time {
    font-size: 12px;
    color: #909399;
  }
}

.conv-actions {
  display: flex;
  gap: 4px;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 12px 16px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 12px;
}

.title-area {
  h3 {
    margin: 0 0 8px;
    font-size: 16px;
  }
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
