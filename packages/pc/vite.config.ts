import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import svgr from 'vite-plugin-svgr'
import createCompressPlugin from 'vite-plugin-compression'

function preloadMainJsPlugin(): Plugin {
  return {
    name: 'preload-main-js',
    transformIndexHtml(html, ctx) {
      if (!ctx.bundle) return html

      const entryChunk = Object.values(ctx.bundle).find(
        (chunk: any) => chunk.isEntry
      )

      if (!entryChunk) return html

      // 添加预加载标签
      return {
        html,
        tags: [
          {
            tag: 'link',
            attrs: {
              rel: 'modulepreload',
              href: `/${entryChunk.fileName}`,
              crossorigin: '',
            },
            injectTo: 'head-prepend',
          }
        ]
      }
    }
  }
}

// https://vitejs.dev/config https://vitest.dev/config
export default defineConfig({
  build: {
    emptyOutDir: false, // Do not clear the `dist` folder before building
    minify: 'terser', // 使用 terser 进行代码压缩
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js'
      }
    }
  },
  plugins: [
    react(),
    svgr({
      include: '**/*.svg?react'
    }),
    tsconfigPaths(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true
      }
    }),
    createCompressPlugin({
      algorithm: 'gzip'
    }),
    preloadMainJsPlugin()
  ],
  // test: {
  //   globals: true,
  //   environment: 'happy-dom',
  //   setupFiles: '.vitest/setup',
  //   include: ['**/test.{ts,tsx}']
  // },
  server: {
    host: '0.0.0.0'
  }
})
