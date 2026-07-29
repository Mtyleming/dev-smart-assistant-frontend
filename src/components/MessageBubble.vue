<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import ClipboardJS from 'clipboard'
import { ElMessage } from 'element-plus'
import { renderMarkdown } from '@/utils/markdown'
import type { ChatMessage } from '@/stores/chat'
import 'highlight.js/styles/github.css'

const props = defineProps<{
  message: ChatMessage
}>()

const html = computed(() => {
  if (props.message.role === 'assistant') {
    return renderMarkdown(props.message.content)
  }
  return ''
})

const copyBtnRef = ref<HTMLButtonElement | null>(null)
let clipboard: ClipboardJS | null = null

onMounted(() => {
  if (!copyBtnRef.value) return
  clipboard = new ClipboardJS(copyBtnRef.value)
  clipboard.on('success', () => ElMessage.success('已复制到剪贴板'))
  clipboard.on('error', () => ElMessage.error('复制失败'))
})

onBeforeUnmount(() => {
  clipboard?.destroy()
})
</script>

<template>
  <div class="message-bubble" :class="message.role">
    <div class="role-label">
      <el-icon v-if="message.role === 'user'"><User /></el-icon>
      <el-icon v-else><Cpu /></el-icon>
      <span>{{ message.role === 'user' ? '我' : '助手' }}</span>
    </div>

    <div v-if="message.role === 'user'" class="content plain">{{ message.content }}</div>
    <div v-else class="content markdown" v-html="html" />

    <button
      v-if="message.role === 'assistant' && message.content"
      ref="copyBtnRef"
      class="copy-btn"
      type="button"
      :data-clipboard-text="message.content"
    >
      复制内容
    </button>
  </div>
</template>

<style scoped lang="scss">
.message-bubble {
  max-width: 820px;
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #ebeef5;
  position: relative;

  &.user {
    margin-left: auto;
    background: #ecf5ff;
    border-color: #d9ecff;
  }

  &.assistant {
    margin-right: auto;
  }
}

.role-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  color: #909399;
  font-size: 13px;
}

.content.plain {
  white-space: pre-wrap;
  line-height: 1.6;
}

.content.markdown {
  line-height: 1.7;
  word-break: break-word;

  :deep(pre.hljs) {
    padding: 12px;
    border-radius: 6px;
    overflow: auto;
    background: #f6f8fa;
  }

  :deep(code) {
    font-family: Consolas, 'Courier New', monospace;
  }
}

.copy-btn {
  margin-top: 8px;
  border: none;
  background: transparent;
  color: #409eff;
  cursor: pointer;
  padding: 0;
  font-size: 13px;
}
</style>
