import http from '@/utils/http'

/** 组织树中的用户节点 */
export interface AdminUserNode {
  id: number
  username: string
  email: string
  role: string
  is_active: boolean
  is_super_admin: boolean
}

/** 组织树中的团队节点 */
export interface AdminTeamNode {
  id: number
  name: string
  description: string | null
  member_count: number
  members: AdminUserNode[]
}

/** 按团队分组的组织树 */
export interface AdminOrganizationTree {
  teams: AdminTeamNode[]
  unassigned_users: AdminUserNode[]
}

/** 获取用户组织树（超级管理员） */
export function getOrganizationTreeApi() {
  return http.get<unknown, AdminOrganizationTree>('/admin/organization')
}

/** 启用或停用用户 */
export function updateUserStatusApi(userId: number, isActive: boolean) {
  return http.put<{ is_active: boolean }, null>(`/admin/users/${userId}/status`, {
    is_active: isActive,
  })
}
