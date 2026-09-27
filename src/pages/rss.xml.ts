import { posix } from 'node:path'
import type { APIContext, ImageMetadata } from 'astro'
import { getImage } from 'astro:assets'
import rss from '@astrojs/rss'

import { getBlogCollection, sortMDByDate } from '@/utils/content'
import { escapeXml, renderFeedContent } from '@/utils/feed'
import config from '@/site-config'

const images = import.meta.glob<{ default: ImageMetadata }>(
  '/src/content/blog/**/*.{jpeg,jpg,png,gif,avif,webp,svg}'
)

export async function GET(context: APIContext) {
  const site = context.site ?? new URL(import.meta.env.SITE)
  const posts = sortMDByDate(await getBlogCollection())
  return rss({
    trailingSlash: false,
    xmlns: { h: 'http://www.w3.org/TR/html4/' },
    stylesheet: '/scripts/pretty-feed-v3.xsl',
    title: config.title,
    description: config.description ?? '',
    site,
    items: await Promise.all(
      posts.map(async (post) => {
        const articleURL = new URL(`/blog/${post.id}`, site).href
        // filePath preserves filesystem casing (e.g. QQBot), unlike the normalized ID.
        const source =
          post.filePath?.replaceAll('\\', '/') ?? `src/content/blog/${post.id}/index.md`
        const sourceDir = posix.dirname('/' + source.replace(/^.*?src\/content\//, 'src/content/'))
        const resolveImage = async (url: string) => {
          if (/^(https?:)?\/\//.test(url) || url.startsWith('/')) return new URL(url, site).href
          const key = posix.normalize(posix.join(sourceDir, decodeURI(url)))
          const loader = images[key]
          if (!loader) throw new Error(`RSS image not found: ${key} (${post.id})`)
          const { default: src } = await loader()
          return new URL((await getImage({ src })).src, site).href
        }
        const cover = post.data.heroImage?.src
        const coverURL = cover
          ? new URL(typeof cover === 'string' ? cover : cover.src, site).href
          : undefined
        return {
          title: post.data.title,
          description: post.data.description,
          pubDate: post.data.publishDate,
          categories: post.data.tags,
          link: articleURL,
          customData: coverURL ? `<h:img src="${escapeXml(coverURL)}" />` : undefined,
          content: await renderFeedContent({
            body: post.body ?? '',
            mdx: source.endsWith('.mdx'),
            articleURL,
            resolveImage
          })
        }
      })
    )
  })
}
