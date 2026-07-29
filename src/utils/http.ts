import axios from 'axios'
import { useUserStore } from '@/stores/user'
import router from '@/router'

/**
 * 统一 Axios 实例
 * - baseURL 默认 /api/v1
 * - 请求自动注入 Bearer Token
 * - 401 时清登录态并跳转登录页
 */
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 15000,
})

http.interceptors.request.use((config) => {
  const userStore = useUserStore()
  if (userStore.token) {
    config.headers.Authorization = `Bearer ${userStore.token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      const userStore = useUserStore()
      userStore.logout()
      router.push('/login')
    }
    return Promise.reject(error)
  },
)

export default http
