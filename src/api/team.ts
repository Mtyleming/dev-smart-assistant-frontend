import http from '@/utils/http'

/** 团队内角色 */
export type TeamMemberRole = 'admin' | 'tech_lead' | 'developer'

/** 团队简要信息 */
export interface TeamBrief {
  id: number
  name: string
}

/** 我的团队（用于切换团队） */
export interface UserTeam {
  id: number
  name: string
  role: TeamMemberRole | string
  isCurrent: boolean
}

interface UserTeamRaw {
  id: number
  name: string
  role: string
  is_current: boolean
}

function mapUserTeam(raw: UserTeamRaw): UserTeam {
  return {
    id: raw.id,
    name: raw.name,
    role: raw.role,
    isCurrent: raw.is_current,
  }
}

/** 团队详情 */
export interface TeamDetail {
  id: number
  name: string
  description: string | null
  memberCount: number
}

/** 团队成员 */
export interface TeamMember {
  id: number
  username: string
  role: TeamMemberRole
}

/** 申请加入团队结果 */
export interface JoinTeamResult {
  requestId: string
  teamId: number
  teamName: string
  status: string
}

/** 邀请码信息 */
export interface InviteCode {
  inviteCode: string
  expiresAt: string
  teamId: number
}

/** 入团申请 */
export interface JoinRequest {
  requestId: string
  userId: number
  username: string
  createdAt: string
  status: string
}

/** 模块状态 */
export interface ModuleStatus {
  module: string
  status: string
  detail?: string | Record<string, unknown> | null
}

interface TeamDetailRaw {
  id: number
  name: string
  description: string | null
  member_count: number
}

interface JoinTeamRaw {
  request_id: string
  team_id: number
  team_name: string
  status: string
}

interface InviteCodeRaw {
  invite_code: string
  expires_at: string
  team_id: number
}

interface JoinRequestRaw {
  request_id: string
  user_id: number
  username: string
  created_at: string
  status: string
}

export interface TeamCreatePayload {
  name: string
  description?: string | null
}

export interface TeamUpdatePayload {
  name?: string | null
  description?: string | null
}

export interface JoinTeamPayload {
  invite_code: string
}

function mapTeamDetail(raw: TeamDetailRaw): TeamDetail {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    memberCount: raw.member_count,
  }
}

function mapJoinTeam(raw: JoinTeamRaw): JoinTeamResult {
  return {
    requestId: raw.request_id,
    teamId: raw.team_id,
    teamName: raw.team_name,
    status: raw.status,
  }
}

function mapInviteCode(raw: InviteCodeRaw): InviteCode {
  return {
    inviteCode: raw.invite_code,
    expiresAt: raw.expires_at,
    teamId: raw.team_id,
  }
}

function mapJoinRequest(raw: JoinRequestRaw): JoinRequest {
  return {
    requestId: raw.request_id,
    userId: raw.user_id,
    username: raw.username,
    createdAt: raw.created_at,
    status: raw.status,
  }
}

/** 团队模块状态 */
export function getTeamsStatusApi() {
  return http.get<unknown, ModuleStatus>('/teams/status')
}

/** 获取我的团队列表 */
export function listMyTeamsApi() {
  return http.get<unknown, UserTeamRaw[]>('/teams/mine').then((list) => list.map(mapUserTeam))
}

/** 获取团队详情 */
export function getTeamApi(teamId: number) {
  return http.get<unknown, TeamDetailRaw>(`/teams/${teamId}`).then(mapTeamDetail)
}

/** 创建团队 */
export function createTeamApi(data: TeamCreatePayload) {
  return http.post<TeamCreatePayload, TeamBrief>('/teams', data)
}

/** 更新团队信息 */
export function updateTeamApi(teamId: number, data: TeamUpdatePayload) {
  return http.put<TeamUpdatePayload, TeamBrief>(`/teams/${teamId}`, data)
}

/** 解散团队 */
export function dissolveTeamApi(teamId: number) {
  return http.delete<unknown, null>(`/teams/${teamId}`)
}

/** 申请加入团队（邀请码） */
export function joinTeamApi(data: JoinTeamPayload) {
  return http.post<JoinTeamPayload, JoinTeamRaw>('/teams/join', data).then(mapJoinTeam)
}

/** 获取团队成员列表 */
export function listTeamMembersApi(teamId: number) {
  return http.get<unknown, TeamMember[]>(`/teams/${teamId}/members`)
}

/** 分配成员角色 */
export function assignMemberRoleApi(teamId: number, userId: number, role: TeamMemberRole) {
  return http.put<{ role: TeamMemberRole }, null>(`/teams/${teamId}/members/${userId}/role`, { role })
}

/** 移除团队成员 */
export function removeTeamMemberApi(teamId: number, userId: number) {
  return http.delete<unknown, null>(`/teams/${teamId}/members/${userId}`)
}

/** 生成邀请码 */
export function createInviteCodeApi(teamId: number) {
  return http.post<unknown, InviteCodeRaw>(`/teams/${teamId}/invites`).then(mapInviteCode)
}

/** 查看入团审批列表 */
export function listJoinRequestsApi(teamId: number) {
  return http
    .get<unknown, JoinRequestRaw[]>(`/teams/${teamId}/join-requests`)
    .then((list) => list.map(mapJoinRequest))
}

/** 审批通过入团申请 */
export function approveJoinRequestApi(teamId: number, requestId: string, role: TeamMemberRole) {
  return http.post<{ role: TeamMemberRole }, null>(
    `/teams/${teamId}/join-requests/${requestId}/approve`,
    { role },
  )
}

/** 拒绝入团申请 */
export function rejectJoinRequestApi(teamId: number, requestId: string) {
  return http.post<unknown, null>(`/teams/${teamId}/join-requests/${requestId}/reject`)
}

/** 团队角色中文名 */
export const TEAM_ROLE_OPTIONS: { value: TeamMemberRole; label: string }[] = [
  { value: 'admin', label: '管理员' },
  { value: 'tech_lead', label: '技术负责人' },
  { value: 'developer', label: '开发者' },
]

export function teamRoleLabel(role: string) {
  return TEAM_ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role
}
