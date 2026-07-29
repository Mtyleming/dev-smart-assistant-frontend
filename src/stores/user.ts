import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface UserInfo {
  username: string
  role: string
  teamId: number
}

/** 用户状态：登录态、Token、角色、所属团队 */
export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
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

  function setLogin(newToken: string, info: UserInfo) {
    token.value = newToken
    userInfo.value = info
    localStorage.setItem('token', newToken)
    localStorage.setItem('userInfo', JSON.stringify(info))
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  }

  return { token, userInfo, isLoggedIn, isAdmin, setLogin, logout }
})
