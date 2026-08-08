import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts', './src/react.ts', './src/vue.ts'],
  dts: true,
  minify: true,
  shims: true,
})
