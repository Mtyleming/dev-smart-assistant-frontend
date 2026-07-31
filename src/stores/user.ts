import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getMeApi, mapUserInfo, switchTeamApi } from '@/api/auth'
import { listMyTeamsApi, type UserTeam } from '@/api/team'

/** 超级管理员用户 ID（固定，前端简单判断） */
export const SUPER_ADMIN_USER_ID = 15

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
  const myTeams = ref<UserTeam[]>([])

  const cachedInfo = localStorage.getItem('userInfo')
  if (cachedInfo) {
    try {
      userInfo.value = JSON.parse(cachedInfo) as UserInfo
    } catch {
      userInfo.value = null
    }
  }

  const isLoggedIn = computed(() => !!token.value)
  const isSuperAdmin = computed(() => userInfo.value?.id === SUPER_ADMIN_USER_ID)
  const currentTeamId = computed(() => userInfo.value?.teamId)
  const currentTeam = computed(() =>
    myTeams.value.find((t) => t.isCurrent) ??
    myTeams.value.find((t) => t.id === userInfo.value?.teamId),
  )

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
    myTeams.value = []
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('userInfo')
  }

  /** 从后端拉取我的团队列表 */
  async function fetchMyTeams() {
    if (!token.value) return
    try {
      myTeams.value = await listMyTeamsApi()
    } catch {
      myTeams.value = []
    }
  }

  async function fetchUserInfo() {
    if (!token.value) return
    try {
      const me = await getMeApi()
      userInfo.value = mapUserInfo(me)
      localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
      if (!isSuperAdmin.value) {
        await fetchMyTeams()
      }
    } catch {
      // 401 由 http 拦截器处理刷新或登出
    }
  }

  /** 切换到已加入的其他团队 */
  async function switchTeam(teamId: number) {
    if (teamId === userInfo.value?.teamId) return
    const authData = await switchTeamApi({ team_id: teamId })
    setLogin(authData.access_token, authData.refresh_token, mapUserInfo(authData.user))
    await fetchMyTeams()
  }

  return {
    token,
    refreshToken,
    userInfo,
    myTeams,
    currentTeam,
    currentTeamId,
    isLoggedIn,
    isSuperAdmin,
    setTokens,
    setLogin,
    logout,
    fetchMyTeams,
    fetchUserInfo,
    switchTeam,
  }
})
