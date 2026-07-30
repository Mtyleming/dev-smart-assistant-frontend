import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getMeApi, mapUserInfo } from '@/api/auth'

export interface UserInfo {
  id: number
  username: string
  email: string
  role: string
  teamId: number
  isActive: boolean
}

/** 用户状态：登录态、Token、角色、所属团队 */
export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const refreshToken = ref(localStorage.getItem('refreshToken') || '')
  const userInfo = ref<UserInfo | null>(null)

  // 从本地缓存恢复用户信息（刷新页面后仍保持登录态）
  const cachedInfo = localStorage.getItem('userInfo')
  if (cachedInfo) {
    try {
      userInfo.value = JSON.parse(cachedInfo) as UserInfo
    } catch {
      userInfo.value = null
    }
  }

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => userInfo.value?.role === 'admin')

  function setTokens(accessToken: string, newRefreshToken: string) {
    token.value = accessToken
    refreshToken.value = newRefreshToken
    localStorage.setItem('token', accessToken)
    localStorage.setItem('refreshToken', newRefreshToken)
  }

  function setLogin(accessToken: string, newRefreshToken: string, info: UserInfo) {
    setTokens(accessToken, newRefreshToken)
    userInfo.value = info
    localStorage.setItem('userInfo', JSON.stringify(info))
  }

  function logout() {
    token.value = ''
    refreshToken.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('userInfo')
  }

  /** 应用启动时拉取用户信息，校验 Token 是否有效 */
  async function fetchUserInfo() {
    if (!token.value) return
    try {
      const me = await getMeApi()
      userInfo.value = mapUserInfo(me)
      localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
    } catch {
      // 401 由 http 拦截器处理刷新或登出
    }
  }

  return {
    token,
    refreshToken,
    userInfo,
    isLoggedIn,
    isAdmin,
    setTokens,
    setLogin,
    logout,
    fetchUserInfo,
  }
})
