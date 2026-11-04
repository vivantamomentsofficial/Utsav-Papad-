import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../src/', import.meta.url))
const forbidden = /\b(localStorage|indexedDB|sessionStorage)\b/
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(path))
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) files.push(path)
  }
  return files
}
const violations = []
for (const file of await walk(root)) {
  if (file.replaceAll('\\', '/').endsWith('/src/lib/supabaseClient.ts')) continue
  const content = await readFile(file, 'utf8')
  if (forbidden.test(content)) violations.push(file)
}
if (violations.length) {
  console.error(`Forbidden browser storage usage found:\n${violations.join('\n')}`)
  process.exit(1)
}
