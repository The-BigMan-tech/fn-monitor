import { execSync } from "child_process";

// 1. Get tags sorted by Semantic Version (newest version first)
const stdout = execSync('git tag --sort=-v:refname').toString().trim();
if (!stdout) {
    console.error('❌ No git tags found in this repository.');
    process.exit(1);
}

// 2. Split and identify tags (filter out empty strings from trailing newlines)
const tags = stdout.split('\n').map(t => t.trim()).filter(Boolean);

const latestTag = tags[0];
const secondLatestTag = tags[1] || null;

console.log(`✨ Latest Tag:        ${latestTag}`);
console.log(`✨ Second Latest Tag: ${secondLatestTag ? secondLatestTag : 'None (First release)'}`);

// 3. Build the changelogen command dynamically
const changelogFile = './CHANGELOG.md';
let command = `changelogen --output=${changelogFile}`;

// Only add the --from flag if a second tag actually exists
if (secondLatestTag) {
    command = `changelogen --from=${secondLatestTag} --to=${latestTag} --output=${changelogFile}`;
}
console.log(`🚀 Running: ${command}`);

// 4. Execute
execSync(command, { stdio: 'inherit' }); // stdio: 'inherit' lets changelogen print its own success logs

console.log('✅ Changelog generated successfully!');