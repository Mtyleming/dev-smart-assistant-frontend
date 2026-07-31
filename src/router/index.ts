import { createRouter, createWebHistory } from 'vue-router'
import NProgress from 'nprogress'
import { useUserStore } from '@/stores/user'

NProgress.configure({ showSpinner: false })

/** 普通用户可访问的业务页面（超级管理员暂时隐藏） */
const userAppPaths = ['/chat', '/knowledge', '/teams']

function defaultHomePath(isSuperAdmin: boolean) {
  return isSuperAdmin ? '/admin' : '/chat'
}

/**
 * 路由表：登录、对话、知识库、管理后台四个核心页面
 * 需要登录的页面设置 meta.requiresAuth
 * 仅超级管理员可访问的页面设置 meta.requiresSuperAdmin
 */
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/LoginView.vue'),
      meta: { title: '登录' },
    },
    {
      path: '/chat',
      name: 'Chat',
      component: () => import('@/views/ChatView.vue'),
      meta: { title: '对话助手', requiresAuth: true },
    },
    {
      path: '/knowledge',
      name: 'Knowledge',
      component: () => import('@/views/KnowledgeView.vue'),
      meta: { title: '知识库管理', requiresAuth: true },
    },
    {
      path: '/teams',
      name: 'Teams',
      component: () => import('@/views/TeamView.vue'),
      meta: { title: '团队管理', requiresAuth: true },
    },
    {
      path: '/admin',
      name: 'Admin',
      component: () => import('@/views/AdminView.vue'),
      meta: { title: '管理后台', requiresAuth: true, requiresSuperAdmin: true },
    },
    { path: '/', redirect: () => defaultHomePath(useUserStore().isSuperAdmin) },
    { path: '/:pathMatch(.*)*', redirect: () => defaultHomePath(useUserStore().isSuperAdmin) },
  ],
})

// 全局前置守卫：进度条 + 登录态/超级管理员校验
router.beforeEach((to, _from, next) => {
  NProgress.start()
  document.title = `${(to.meta.title as string) || '开发智能助手'} - 开发智能助手`

  const userStore = useUserStore()

  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  if (to.meta.requiresSuperAdmin && !userStore.isSuperAdmin) {
    next('/chat')
    return
  }

  // 超级管理员暂时只能访问管理后台
  if (userStore.isSuperAdmin && userAppPaths.includes(to.path)) {
    next('/admin')
    return
  }

  // 已登录访问登录页时，进入对应首页
  if (to.path === '/login' && userStore.isLoggedIn) {
    next(defaultHomePath(userStore.isSuperAdmin))
    return
  }

  next()
})

router.afterEach(() => {
  NProgress.done()
})

export default router
