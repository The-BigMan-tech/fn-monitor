import { defineConfig } from 'eslint/config';
import { parser } from 'typescript-eslint'; // 1. Import the parser
import stylistic from '@stylistic/eslint-plugin';

const config = defineConfig(
    {
        files:[
            'src/**/*.ts',
            'tests/**/*.ts'
        ],
        languageOptions: {
            parser 
        },
        plugins: {
            '@stylistic': stylistic
        },
        rules: {
            '@stylistic/indent': ['warn', 4] 
        }
    }
)
export default config;
