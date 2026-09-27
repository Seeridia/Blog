import type { Root } from 'mdast'
import rehypeKatex from 'rehype-katex'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'

// Only static content is exported. MDX imports and expressions are never executed.
type FeedNode = {
  type: string
  name?: string | null
  value?: string
  url?: string
  alt?: string
  attributes?: { type: string; name?: string; value?: unknown }[]
  children?: FeedNode[]
}

function staticAttribute(node: FeedNode, name: string): string | undefined {
  const attr = node.attributes?.find(
    (item) => item.type === 'mdxJsxAttribute' && item.name === name
  )
  return typeof attr?.value === 'string' ? attr.value : undefined
}

function readableMdx(nodes: FeedNode[], articleURL: string): FeedNode[] {
  return nodes.flatMap((node): FeedNode[] => {
    if (['mdxjsEsm', 'mdxFlowExpression', 'mdxTextExpression'].includes(node.type)) return []
    if (node.children) node.children = readableMdx(node.children, articleURL)
    if (!['mdxJsxFlowElement', 'mdxJsxTextElement'].includes(node.type)) return [node]
    if (['script', 'style'].includes(node.name ?? '')) return []
    const src = staticAttribute(node, 'src')
    if (node.name === 'img' && src) {
      return [{ type: 'image', url: src, alt: staticAttribute(node, 'alt') ?? '' }]
    }
    const href = staticAttribute(node, 'href')
    const children = node.children ?? []
    if (href) {
      const link: FeedNode = {
        type: 'link',
        url: href,
        children: children.length
          ? children
          : [{ type: 'text', value: staticAttribute(node, 'title') ?? href }]
      }
      return node.type === 'mdxJsxFlowElement' ? [{ type: 'paragraph', children: [link] }] : [link]
    }
    // Aside, Steps, Tabs, etc. retain their prose instead of losing entire subtrees.
    if (children.length) return children
    if (node.name && /^[A-Z]/.test(node.name)) {
      const link: FeedNode = {
        type: 'link',
        url: articleURL,
        children: [{ type: 'text', value: '在原文中查看交互内容' }]
      }
      return node.type === 'mdxJsxFlowElement' ? [{ type: 'paragraph', children: [link] }] : [link]
    }
    return []
  })
}

export async function renderFeedContent(options: {
  body: string
  mdx: boolean
  articleURL: string
  resolveImage: (url: string) => Promise<string>
}) {
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMath)
  if (options.mdx) processor.use(remarkMdx)
  const file = await processor
    .use(() => async (tree: Root) => {
      tree.children = readableMdx(
        tree.children as FeedNode[],
        options.articleURL
      ) as Root['children']
      const images: Promise<void>[] = []
      visit(tree, 'image', (node) => {
        images.push(
          options.resolveImage(node.url).then((url) => {
            node.url = url
          })
        )
      })
      visit(tree, 'link', (node) => {
        node.url = new URL(node.url, options.articleURL).href
      })
      await Promise.all(images)
    })
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeKatex, { output: 'mathml' })
    .use(rehypeStringify)
    .process(options.body)
  return String(file)
}

export function escapeXml(value: string) {
  return value.replace(
    /[<>&"']/g,
    (char) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;'
      })[char]!
  )
}
