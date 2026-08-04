import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// Vite 构建配置：路径别名、Element Plus 按需引入、开发代理
export default defineConfig({
  plugins: [
    vue(),
    // Element Plus API（如 ElMessage）自动导入
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    // Element Plus 组件自动按需注册
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  resolve: {
    // @ 指向 src，方便业务代码引用
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // 开发环境将 /api 请求代理到后端，避免跨域
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // 流式对话 SSE 可能较长，避免代理提前断开
        timeout: 0,
        proxyTimeout: 0,
      },
    },
  },
})
