import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse } from 'node-html-parser'

const root = 'dist'
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  return (
    await Promise.all(
      entries.map(async (entry) => {
        const path = join(dir, entry.name)
        return entry.isDirectory() ? walk(path) : [path]
      })
    )
  ).flat()
}
const files = await walk(root)
const htmlFiles = files.filter((file) => file.endsWith('.html'))
let indexed = 0
for (const file of htmlFiles) {
  const html = parse(await readFile(file, 'utf8'))
  if (html.querySelector('[data-pagefind-body]')) indexed++
  for (const el of html.querySelectorAll(
    'img[src], script[src], source[src], link[rel="stylesheet"], link[rel="preload"], link[rel="icon"]'
  )) {
    const url = el.getAttribute('src') ?? el.getAttribute('href')
    if (!url?.startsWith('/') || url.startsWith('//')) continue
    const path = join(root, decodeURI(url.split(/[?#]/)[0]))
    assert.ok((await stat(path)).isFile(), `Missing asset: ${url} in ${file}`)
  }
  const published = html
    .querySelector('meta[property="article:published_time"]')
    ?.getAttribute('content')
  if (published)
    assert.ok(!Number.isNaN(Date.parse(published)), `Invalid publication date: ${file}`)
}
assert.ok(indexed > 0 && indexed < htmlFiles.length, 'Search must be limited to content pages')
const feed = parse(await readFile(join(root, 'rss.xml'), 'utf8'))
const items = feed.querySelectorAll('item')
assert.ok(items.length > 0, 'RSS is empty')
for (const item of items) {
  const body = parse(
    item.childNodes.find((node) => node.rawTagName?.toLowerCase() === 'content:encoded')
      ?.textContent ?? ''
  )
  assert.ok(
    !body.querySelectorAll('p').some((p) => /^import\s/.test(p.textContent)),
    'RSS leaked an MDX import'
  )
  for (const img of body.querySelectorAll('img'))
    assert.match(img.getAttribute('src') ?? '', /^https?:\/\//)
}
const manifest = {}
for (const file of files.sort()) {
  const name = file.slice(root.length + 1)
  if (name === 'build-manifest.json') continue
  manifest[name] = createHash('sha256')
    .update(await readFile(file))
    .digest('hex')
}
await writeFile(join(root, 'build-manifest.json'), JSON.stringify({ files: manifest }, null, 2))
console.log(
  `Verified ${htmlFiles.length} pages, ${indexed} search pages, ${items.length} RSS entries; release hashes written.`
)
