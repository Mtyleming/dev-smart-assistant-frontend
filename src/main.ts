import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import 'nprogress/nprogress.css'

import App from './App.vue'
import router from './router'
import { useUserStore } from './stores/user'
import '@/styles/index.scss'

const app = createApp(App)

// 注册全部 Element Plus 图标，页面中可直接 <el-icon><ChatDotRound /></el-icon>
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ElementPlus, { locale: zhCn })

// 有 Token 时拉取用户信息，校验登录态是否有效
const userStore = useUserStore()
if (userStore.token) {
  userStore.fetchUserInfo()
}

app.mount('#app')
