const matter = require('gray-matter')
const { UUID_RE } = require('./constants.cjs')

function isElogMarkdown(raw) {
    const parsed = matter(raw)

    return Boolean(
        parsed.data.urlname ||
        parsed.data.status ||
        parsed.data.cover !== undefined
    )
}

function escapeSingleQuote(value) {
    return String(value ?? '').replace(/'/g, "''")
}

function formatYamlString(value) {
    const stringValue = String(value ?? '')

    if (!stringValue) return "''"
    if (/^[\w\u4e00-\u9fa5][\w\u4e00-\u9fa5\s\-（）()·+&/]*$/.test(stringValue)) {
        return stringValue
    }

    return `'${escapeSingleQuote(stringValue)}'`
}

function formatDate(value) {
    if (!value) return ''

    const raw = String(value).trim()

    // 已经是 2025-09-11 01:30:00 这种格式，就直接保留
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(raw)) {
        return raw.length === 16 ? `${raw}:00` : raw
    }

    // 兼容 ISO 格式，例如 2025-09-11T01:30:00.000Z
    const date = new Date(raw)
    if (!Number.isNaN(date.getTime())) {
        const pad = (n) => String(n).padStart(2, '0')

        return [
            date.getFullYear(),
            pad(date.getMonth() + 1),
            pad(date.getDate()),
        ].join('-') + ' ' + [
            pad(date.getHours()),
            pad(date.getMinutes()),
            pad(date.getSeconds()),
        ].join(':')
    }

    return raw
}

function normalizeTags(tags) {
    if (!tags) return []

    if (Array.isArray(tags)) {
        return tags.map((tag) => String(tag).trim()).filter(Boolean)
    }

    if (typeof tags === 'string') {
        return tags
            .split(/[,，]/)
            .map((tag) => tag.trim())
            .filter(Boolean)
    }

    return []
}

function normalizeSlug(value) {
    return String(value ?? '')
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\/+|\/+$/g, '')
        .replace(/[<>:"|?*]/g, '-')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
}

function getArticleSlug(frontmatter, fallbackTitle) {
    const urlname = normalizeSlug(frontmatter.urlname)

    if (urlname && !UUID_RE.test(urlname)) {
        return urlname
    }

    return normalizeSlug(fallbackTitle)
}

function buildFrontmatter(frontmatter, articleTitle, heroColor) {
    const title = frontmatter.title || articleTitle
    const publishDate = formatDate(
        frontmatter.publishDate ||
        frontmatter.date ||
        frontmatter.created ||
        frontmatter.createdAt ||
        frontmatter.updated
    )

    const description = frontmatter.description || ''
    const tags = normalizeTags(frontmatter.tags)
    const language = frontmatter.language || '中文'

    const lines = []

    lines.push('---')
    lines.push(`title: ${formatYamlString(title)}`)
    lines.push(`publishDate: ${publishDate || "''"}`)
    lines.push(`description: '${escapeSingleQuote(description)}'`)

    if (tags.length > 0) {
        lines.push('tags:')
        for (const tag of tags) {
            lines.push(`  - ${formatYamlString(tag)}`)
        }
    }

    if (heroColor) {
        lines.push(`heroImage: { src: './cover.webp', color: '${heroColor}' }`)
    }

    lines.push(`language: '${escapeSingleQuote(language)}'`)
    lines.push('---')
    lines.push('')

    return lines.join('\n')
}

module.exports = {
    buildFrontmatter,
    escapeSingleQuote,
    formatDate,
    formatYamlString,
    getArticleSlug,
    isElogMarkdown,
    normalizeSlug,
    normalizeTags,
}
