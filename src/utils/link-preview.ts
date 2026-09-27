import { parse } from 'node-html-parser'

import { cachedRemote } from './remote-cache'

export async function getLinkPreview(href: string) {
  return cachedRemote(href, async (response) => {
    const html = parse(await response.text())
    const meta = (key: string) =>
      html.querySelector(`meta[property="${key}"], meta[name="${key}"]`)?.getAttribute('content')
    const image = meta('og:image')
    return {
      title:
        meta('og:title') ||
        html.querySelector('title')?.textContent.trim() ||
        new URL(href).hostname,
      description: meta('og:description') || meta('description'),
      image: image ? new URL(image, response.url || href).href : undefined
    }
  })
}
