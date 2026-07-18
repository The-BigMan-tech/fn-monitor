import { defineConfig } from 'vitest/config'
import dts from 'vite-plugin-dts'
import { builtinModules } from 'node:module'

import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

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
                ...builtinModules, 
                ...builtinModules.map(m => `node:${m}`),
                ...Object.keys(pkg.dependencies || {}),
            ],
            output: {
                // Prevent Rollup from renaming variables to short names
                generatedCode: {
                    symbols: true,
                },
                preserveModules: true, // Optional: keeps files separate instead of one big bundle
                preserveModulesRoot: 'src',
                entryFileNames: '[name].js',// This forces Rollup to keep the original file name and path
                // Ensures that even chunks keep their original folder structure
                chunkFileNames: '[name].js',
                assetFileNames: '[name][extname]',
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
