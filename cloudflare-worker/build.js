import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')
const outDir = resolve(__dirname, 'out')

console.log('1. Building frontend...')
execSync('npm run build', { cwd: rootDir, stdio: 'inherit' })

console.log('2. Preparing deployment folder...')
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

console.log('3. Copying frontend assets...')
cpSync(join(rootDir, 'dist'), outDir, { recursive: true })

console.log('4. Copying functions...')
cpSync(resolve(__dirname, 'functions'), join(outDir, 'functions'), { recursive: true })

console.log('\n✅ Done! Upload the "out" folder to Cloudflare Pages.')
