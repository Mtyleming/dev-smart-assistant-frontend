import http from '@/utils/http'
import type { UserInfo } from '@/stores/user'

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  userInfo: UserInfo
}

/** 登录接口（后端就绪后走真实 API） */
export function loginApi(data: LoginPayload) {
  return http.post<any, LoginResult>('/auth/login', data)
}
