import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const pending = new Map<string, Promise<unknown>>()
const cacheDir = join(process.cwd(), '.cache', 'remote')
const maxAge = 7 * 24 * 60 * 60 * 1000

/** Deduplicate requests, bound network waits, and retain the last successful snapshot. */
export function cachedRemote<T>(
  url: string,
  parse: (response: Response) => Promise<T>
): Promise<T | undefined> {
  const existing = pending.get(url)
  if (existing) return existing as Promise<T | undefined>
  const request = load(url, parse)
  pending.set(url, request)
  return request
}

async function load<T>(
  url: string,
  parse: (response: Response) => Promise<T>
): Promise<T | undefined> {
  const file = join(cacheDir, `${createHash('sha256').update(url).digest('hex')}.json`)
  let cached: { updated: number; value: T } | undefined
  try {
    cached = JSON.parse(await readFile(file, 'utf8'))
  } catch {
    /* First build or invalid cache. */
  }
  if (cached && Date.now() - cached.updated < maxAge && process.env.REFRESH_REMOTE !== '1')
    return cached.value
  if (process.env.BLOG_OFFLINE === '1') return cached?.value
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const value = await parse(response)
    await mkdir(cacheDir, { recursive: true })
    const temporary = `${file}.${process.pid}.tmp`
    await writeFile(temporary, JSON.stringify({ updated: Date.now(), value }))
    await rename(temporary, file)
    return value
  } catch (error) {
    console.warn(
      `[remote] ${url}: ${String(error)}; ${cached ? 'using cached snapshot' : 'using fallback'}`
    )
    return cached?.value
  }
}
