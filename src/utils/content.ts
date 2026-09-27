import { getCollection, type CollectionEntry } from 'astro:content'

type Post = CollectionEntry<'blog'>

/** All routes share the same publication policy; drafts remain previewable locally. */
export async function getBlogCollection() {
  return getCollection('blog', ({ data }) => !import.meta.env.PROD || !data.draft)
}

export function sortMDByDate(posts: Post[]): Post[] {
  return [...posts].sort(
    (a, b) =>
      (b.data.updatedDate ?? b.data.publishDate).valueOf() -
        (a.data.updatedDate ?? a.data.publishDate).valueOf() || a.id.localeCompare(b.id)
  )
}

export function getUniqueTags(posts: Post[]) {
  return [...new Set(posts.flatMap(({ data }) => data.tags))]
}

export function getUniqueTagsWithCount(posts: Post[]): [string, number][] {
  const counts = new Map<string, number>()
  for (const { data } of posts) {
    for (const tag of data.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return [...counts].sort((a, b) => b[1] - a[1])
}

export function groupCollectionsByYear(posts: Post[]): [number, Post[]][] {
  const years = new Map<number, Post[]>()
  for (const post of posts) {
    const year = (post.data.updatedDate ?? post.data.publishDate).getUTCFullYear()
    years.set(year, [...(years.get(year) ?? []), post])
  }
  return [...years].sort((a, b) => b[0] - a[0])
}
