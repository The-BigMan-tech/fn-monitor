import { ChangelogConfig } from "changelogen";

const config:Partial<ChangelogConfig> = {
    types: {
        feat:true,
        fix:true,
        docs:true,
        perf:true,
        refactor:true,
        test:false,
        chore:false,
        build:false,
    },
    hideAuthorEmail:true,
};
export default config;
