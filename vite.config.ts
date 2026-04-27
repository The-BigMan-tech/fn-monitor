import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    target: 'es2024',
     rollupOptions: {
      external: ['chalk'], 
    },
    lib: {
      name: 'Sval',
      entry: 'src/index.ts',
    },
  },
  plugins: [
    dts({ 
        beforeWriteFile: (filePath, content) => {
            return {
                filePath: filePath.replace('index.d.ts', 'script-monitor.d.ts'),
                content
            }
        }
    }),
  ],
  test: {
    environment: 'happy-dom',
    coverage: {
      include: ['src/**/*.ts'],
    },
  },
})
