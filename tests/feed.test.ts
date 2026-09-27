import assert from 'node:assert/strict'
import { test } from 'node:test'

import { renderFeedContent } from '../src/utils/feed'

const render = (body: string, mdx = true) =>
  renderFeedContent({
    body,
    mdx,
    articleURL: 'https://example.com/blog/post',
    resolveImage: async (url) => `https://example.com/assets/${url.replace('./', '')}`
  })

test('RSS strips executable MDX while keeping nested prose and code', async () => {
  const html = await render(
    "import { Aside } from './Aside.astro'\n\n<Aside>\n\n正文 **重点**\n\n![截图](./example.webp)\n\n</Aside>\n\n```js\nimport kept from 'code-example'\n```\n\n{dangerous()}"
  )
  assert.ok(!html.includes('Aside.astro'))
  assert.ok(!html.includes('dangerous'))
  assert.ok(html.includes('正文 <strong>重点</strong>'))
  assert.ok(html.includes('https://example.com/assets/example.webp'))
  assert.ok(html.includes("import kept from 'code-example'"))
})

test('RSS preserves preview links and gives interactive widgets a readable fallback', async () => {
  const html = await render('<LinkPreview href="https://example.org" />\n\n<ColorRamp />')
  assert.ok(html.includes('href="https://example.org/"'))
  assert.ok(html.includes('在原文中查看交互内容'))
})

test('plain Markdown braces remain text and unsafe links are removed', async () => {
  const html = await render(
    'Hello {world}\n\n[bad](javascript:alert%281%29)\n\n[section](#part)',
    false
  )
  assert.ok(html.includes('{world}'))
  assert.ok(!html.includes('javascript:'))
  assert.ok(html.includes('https://example.com/blog/post#part'))
})

test('MDX math is exported as MathML without treating braces as expressions', async () => {
  const html = await render('公式：$\\frac{a}{b}$')
  assert.ok(html.includes('<math'))
  assert.ok(html.includes('<mfrac>'))
})
