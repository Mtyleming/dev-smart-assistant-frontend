<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { loginApi } from '@/api/auth'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const formRef = ref<FormInstance>()
const loading = ref(false)
const form = reactive({
  username: '',
  password: '',
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

/**
 * 登录：优先调用后端；后端不可用时，提供本地演示登录，方便先跑通前端
 * - 用户名 admin / 密码任意 => 管理员
 * - 其他用户名 => 普通用户
 */
async function handleLogin() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    try {
      const result = await loginApi(form)
      userStore.setLogin(result.token, result.userInfo)
    } catch {
      // 后端未就绪时的本地演示登录
      const role = form.username.trim() === 'admin' ? 'admin' : 'user'
      userStore.setLogin(`demo-token-${Date.now()}`, {
        username: form.username.trim(),
        role,
        teamId: 1,
      })
      ElMessage.warning('后端未连接，已使用本地演示登录')
    }

    ElMessage.success('登录成功')
    const redirect = (route.query.redirect as string) || '/chat'
    router.replace(redirect)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-panel page-card">
      <h1>开发智能助手</h1>
      <p class="subtitle">登录后开始使用对话、知识库与管理功能</p>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @keyup.enter="handleLogin">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="试试 admin 体验管理后台" clearable />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-button type="primary" class="submit-btn" :loading="loading" @click="handleLogin">
          登录
        </el-button>
      </el-form>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login-page {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #e8f1ff 0%, #f5f7fa 45%, #eef6ff 100%);
}

.login-panel {
  width: 400px;
  max-width: calc(100% - 32px);

  h1 {
    margin: 0 0 8px;
    font-size: 24px;
  }

  .subtitle {
    margin: 0 0 24px;
    color: #909399;
  }

  .submit-btn {
    width: 100%;
    margin-top: 8px;
  }
}
</style>
