import http from '@/utils/http'

export interface AdminUser {
  id: number
  username: string
  role: string
  teamId: number
  status: 'active' | 'disabled'
}

/** 获取用户列表（管理后台） */
export function fetchUsersApi() {
  return http.get<any, AdminUser[]>('/admin/users')
}

/** 更新用户角色或状态 */
export function updateUserApi(id: number, data: Partial<AdminUser>) {
  return http.put(`/admin/users/${id}`, data)
}
