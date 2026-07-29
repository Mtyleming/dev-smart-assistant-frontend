import http from '@/utils/http'

export interface KnowledgeBase {
  id: number
  name: string
  docCount: number
  updatedAt?: string
}

/** 获取知识库列表 */
export function fetchKnowledgeListApi() {
  return http.get<any, KnowledgeBase[]>('/knowledge')
}

/** 创建知识库 */
export function createKnowledgeApi(name: string) {
  return http.post('/knowledge', { name })
}

/** 删除知识库 */
export function deleteKnowledgeApi(id: number) {
  return http.delete(`/knowledge/${id}`)
}
