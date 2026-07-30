import http from '@/utils/http'
import type { UserInfo } from '@/stores/user'

/** 后端统一响应包装 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

/** 登录/注册/刷新返回的认证数据 */
export interface AuthData {
  access_token: string
  refresh_token: string
  user: UserBasicInfo
}

/** 用户基本信息（后端 snake_case） */
export interface UserBasicInfo {
  id: number
  username: string
  email: string
  team_id: number
  role: string
  is_active: boolean
}

/** 当前用户信息（/auth/me） */
export interface MeData {
  id: number
  username: string
  email: string
  role: string
  team_id: number
}

export interface LoginPayload {
  number: string
  password: string
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
}

export interface RefreshPayload {
  refresh_token: string
}

/** 将后端用户字段转为前端 UserInfo */
export function mapUserInfo(user: UserBasicInfo | MeData): UserInfo {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    teamId: user.team_id,
    isActive: 'is_active' in user ? user.is_active : true,
  }
}

/** 登录 */
export function loginApi(data: LoginPayload) {
  return http.post<LoginPayload, AuthData>('/auth/login', data)
}

/** 注册 */
export function registerApi(data: RegisterPayload) {
  return http.post<RegisterPayload, AuthData>('/auth/register', data)
}

/** 刷新 Token */
export function refreshTokenApi(data: RefreshPayload) {
  return http.post<RefreshPayload, AuthData>('/auth/refresh', data)
}

/** 退出登录 */
export function logoutApi() {
  return http.post<unknown, null>('/auth/logout')
}

/** 获取当前用户信息 */
export function getMeApi() {
  return http.get<unknown, MeData>('/auth/me')
}
