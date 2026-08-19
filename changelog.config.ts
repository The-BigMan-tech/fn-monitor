import { ChangelogConfig } from "changelogen";

const config:Partial<ChangelogConfig> = {
    types: {
        feat: { title: "🚀 Features" },
        fix: { title: "🩹 Fixes" },
        docs: { title: "📖 Documentation" },
        perf: { title: "⚡ Performance" },
        refactor:{ title: "♻️ Refactor"},
        build:{ title: "🛠️ Build"},
        chore:{ title: "🧹 Chore"},
        test:false
    },
    hideAuthorEmail:true,
};
export default config;
