<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { loginApi, registerApi, mapUserInfo } from '@/api/auth'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const activeTab = ref<'login' | 'register'>('login')
const loginFormRef = ref<FormInstance>()
const registerFormRef = ref<FormInstance>()
const loading = ref(false)

const loginForm = reactive({
  number: '',
  password: '',
})

const registerForm = reactive({
  username: '',
  email: '',
  password: '',
})

const loginRules: FormRules = {
  number: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const registerRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名长度 3-50 个字符', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleLogin() {
  const valid = await loginFormRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const authData = await loginApi({
      number: loginForm.number.trim(),
      password: loginForm.password,
    })
    userStore.setLogin(
      authData.access_token,
      authData.refresh_token,
      mapUserInfo(authData.user),
    )
    ElMessage.success('登录成功')
    const redirect = (route.query.redirect as string) || '/chat'
    router.replace(redirect)
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '登录失败')
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  const valid = await registerFormRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const authData = await registerApi({
      username: registerForm.username.trim(),
      email: registerForm.email.trim(),
      password: registerForm.password,
    })
    userStore.setLogin(
      authData.access_token,
      authData.refresh_token,
      mapUserInfo(authData.user),
    )
    ElMessage.success('注册成功')
    router.replace('/chat')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '注册失败')
  } finally {
    loading.value = false
  }
}

function handleSubmit() {
  if (activeTab.value === 'login') {
    handleLogin()
  } else {
    handleRegister()
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-panel page-card">
      <h1>开发智能助手</h1>
      <p class="subtitle">登录或注册后开始使用对话、知识库与管理功能</p>

      <el-tabs v-model="activeTab" class="auth-tabs">
        <el-tab-pane label="登录" name="login">
          <el-form
            ref="loginFormRef"
            :model="loginForm"
            :rules="loginRules"
            label-position="top"
            @keyup.enter="handleLogin"
          >
            <el-form-item label="账号" prop="number">
              <el-input v-model="loginForm.number" placeholder="用户名或工号" clearable />
            </el-form-item>
            <el-form-item label="密码" prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                placeholder="请输入密码"
                show-password
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="注册" name="register">
          <el-form
            ref="registerFormRef"
            :model="registerForm"
            :rules="registerRules"
            label-position="top"
            @keyup.enter="handleRegister"
          >
            <el-form-item label="用户名" prop="username">
              <el-input v-model="registerForm.username" placeholder="3-50 个字符" clearable />
            </el-form-item>
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="registerForm.email" placeholder="请输入邮箱" clearable />
            </el-form-item>
            <el-form-item label="密码" prop="password">
              <el-input
                v-model="registerForm.password"
                type="password"
                placeholder="请输入密码"
                show-password
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>

      <el-button type="primary" class="submit-btn" :loading="loading" @click="handleSubmit">
        {{ activeTab === 'login' ? '登录' : '注册' }}
      </el-button>
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
    margin: 0 0 16px;
    color: #909399;
  }

  .auth-tabs {
    :deep(.el-tabs__header) {
      margin-bottom: 16px;
    }
  }

  .submit-btn {
    width: 100%;
    margin-top: 8px;
  }
}
</style>
