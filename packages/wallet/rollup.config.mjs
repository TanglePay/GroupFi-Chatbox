import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts', // 假设你的入口文件是 src/index.ts
  output: {
    file: 'dist/bundle.js',
    format: 'es', // 或者 'umd'，取决于你的需求
    sourcemap: true
  },
  plugins: [
    resolve(),
    commonjs(),
    typescript()
  ]
};