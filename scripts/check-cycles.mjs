/**
 * 循环依赖守门（审计 A-29）：零依赖实现——遍历 src 的相对 import 建图，
 * DFS 三色标记找环，发现即非零退出并打印环路径。
 * （原计划用 madge，但其 peer 要求 typescript ^5 与本仓 TS 6 冲突、
 * 会让 CI 的 npm ci 严格解析失败，故自研等效检查。）
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(root, 'src')

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.tsx?$/.test(name) && !name.endsWith('.d.ts')) out.push(p)
  }
  return out
}

function resolveImport(fromFile, spec) {
  const base = resolve(dirname(fromFile), spec)
  for (const cand of [base + '.ts', base + '.tsx', join(base, 'index.ts'), join(base, 'index.tsx'), base]) {
    if (existsSync(cand) && statSync(cand).isFile()) return cand
  }
  return null
}

const files = walk(srcDir)
const graph = new Map()
const importRe = /(?:from\s+|import\s*\(\s*|import\s+)['"](\.[^'"]+)['"]/g
for (const f of files) {
  const text = readFileSync(f, 'utf8')
  const edges = new Set()
  let m
  while ((m = importRe.exec(text)) !== null) {
    const target = resolveImport(f, m[1])
    if (target && target !== f) edges.add(target)
  }
  graph.set(f, [...edges])
}

const WHITE = 0
const GRAY = 1
const BLACK = 2
const color = new Map(files.map((f) => [f, WHITE]))
const cycles = []

function dfs(node, stack) {
  color.set(node, GRAY)
  stack.push(node)
  for (const next of graph.get(node) ?? []) {
    const c = color.get(next) ?? WHITE
    if (c === GRAY) {
      const at = stack.indexOf(next)
      cycles.push([...stack.slice(at), next].map((p) => relative(root, p)).join(' > '))
    } else if (c === WHITE) {
      dfs(next, stack)
    }
  }
  stack.pop()
  color.set(node, BLACK)
}

for (const f of files) {
  if (color.get(f) === WHITE) dfs(f, [])
}

if (cycles.length > 0) {
  console.error(`发现 ${cycles.length} 条循环依赖：`)
  for (const c of cycles) console.error('  ' + c)
  process.exit(1)
}
console.log(`循环依赖检查通过（${files.length} 个文件，零环）`)
