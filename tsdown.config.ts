import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts', './src/react.tsx'],
  deps: { neverBundle: ['react', 'react-dom'] },
  dts: true,
  minify: true,
  shims: true,
})
