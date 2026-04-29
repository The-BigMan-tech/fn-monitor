import { defineConfig } from 'vitest/config'
import dts from 'vite-plugin-dts'
import { builtinModules } from 'node:module'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
    build: {
        target: 'esnext', // Keep the latest syntax
        minify: false,    // Stop the "scattered" / obfuscated look
        lib: {
            entry: 'src/index.ts',
            fileName: 'index',
            formats: ['es'], // Use ES modules to keep it clean and readable
        },
        rollupOptions: {
            external: [
                'chalk',
                ...builtinModules, 
                ...builtinModules.map(m => `node:${m}`),
                ...Object.keys(pkg.dependencies || {}),
            ], // Add crypto here to prevent bundling it
            output: {
                // Prevent Rollup from renaming variables to short names
                generatedCode: {
                    symbols: true,
                },
              preserveModules: true, // Optional: keeps files separate instead of one big bundle
            },
        },
    },
    plugins: [
        dts(),
    ],
    test: {
        include: ['tests/**/*.{test,spec}.ts'],
        environment: 'happy-dom',
        coverage: {
            include: ['src/**/*.ts'],
        },
    },
})
