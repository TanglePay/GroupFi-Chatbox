import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import svgr from 'vite-plugin-svgr'
import createCompressPlugin from 'vite-plugin-compression'

// https://vitejs.dev/config https://vitest.dev/config
export default defineConfig({
  build: {
    emptyOutDir: false, // Do not clear the `dist` folder before building
    minify: 'terser', // 使用 terser 进行代码压缩
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
    })
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
