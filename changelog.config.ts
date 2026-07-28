import { ChangelogConfig } from "changelogen";

const config:Partial<ChangelogConfig> = {
    hideAuthorEmail:true,
    
    types: {
        feat: { title: "🚀 Features" },
        fix: { title: "🩹 Fixes" },
        docs: { title: "📖 Documentation" },
        perf: { title: "⚡ Performance" },

        test:false,
        chore:false,
        build:false,
        refactor:false 
    }
};

export default config;
