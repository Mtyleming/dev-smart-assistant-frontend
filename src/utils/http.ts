import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useUserStore } from '@/stores/user'
import router from '@/router'
import { refreshTokenApi } from '@/api/auth'
import type { ApiResponse } from '@/api/auth'

/**
 * 统一 Axios 实例
 * - baseURL 默认 /api/v1
 * - 请求自动注入 Bearer Token
 * - 解包后端 { code, message, data } 响应
 * - 401 时尝试刷新 Token，失败则清登录态并跳转登录页
 */
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 15000,
})

/** 是否正在刷新 Token，避免并发重复刷新 */
let isRefreshing = false
/** 刷新期间挂起的请求，刷新成功后用新 Token 重试 */
let pendingRequests: Array<(token: string) => void> = []

function isAuthEndpoint(url?: string) {
  if (!url) return false
  return url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh')
}

function extractErrorMessage(error: AxiosError<ApiResponse>) {
  const body = error.response?.data
  if (body?.message) return body.message
  const status = error.response?.status
  if (status === 401) return '账号或密码错误'
  if (status === 404) return '账号不存在'
  if (status === 422) return '请求参数有误'
  return error.message || '网络请求失败'
}

http.interceptors.request.use((config) => {
  const userStore = useUserStore()
  if (userStore.token) {
    config.headers.Authorization = `Bearer ${userStore.token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResponse
    if (body && typeof body.code === 'number') {
      if (body.code !== 0) {
        return Promise.reject(new Error(body.message || '请求失败'))
      }
      return body.data as never
    }
    return response.data as never
  },
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isAuthEndpoint(originalRequest.url)) {
        return Promise.reject(new Error(extractErrorMessage(error)))
      }

      const userStore = useUserStore()

      if (!userStore.refreshToken) {
        userStore.logout()
        router.push('/login')
        return Promise.reject(new Error(extractErrorMessage(error)))
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            http(originalRequest).then(resolve).catch(reject)
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const authData = await refreshTokenApi({ refresh_token: userStore.refreshToken })
        userStore.setTokens(authData.access_token, authData.refresh_token)
        pendingRequests.forEach((cb) => cb(authData.access_token))
        pendingRequests = []
        originalRequest.headers.Authorization = `Bearer ${authData.access_token}`
        return http(originalRequest)
      } catch {
        userStore.logout()
        router.push('/login')
        return Promise.reject(new Error('登录已过期，请重新登录'))
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(new Error(extractErrorMessage(error)))
  },
)

export default http
