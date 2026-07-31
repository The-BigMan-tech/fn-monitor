import { ChangelogConfig } from "changelogen";

const config:Partial<ChangelogConfig> = {
    types: {
        feat: { title: "🚀 Features" },
        fix: { title: "🩹 Fixes" },
        docs: { title: "📖 Documentation" },
        perf: { title: "⚡ Performance" },
        refactor:{ title: "♻️ Refactor"},

        test:false,
        chore:false,
        build:false,
    },
    hideAuthorEmail:true,
};
export default config;
