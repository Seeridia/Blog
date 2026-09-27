import { execFileSync, spawnSync } from 'node:child_process'

// Only maintained, tracked code is checked; prose and local drafts are not rewritten.
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(
    (file) =>
      /\.(astro|ts|css|mjs|json)$/.test(file) &&
      /^(src\/|tests\/|scripts\/[^/]+\.mjs$|[^/]+$)/.test(file)
  )
const result = spawnSync(
  'bun',
  [
    'x',
    '--no-install',
    'prettier',
    process.argv.includes('--write') ? '--write' : '--check',
    ...files
  ],
  { stdio: 'inherit' }
)
process.exit(result.status ?? 1)
