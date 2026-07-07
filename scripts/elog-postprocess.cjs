const fs = require('fs')
const path = require('path')
const matter = require('gray-matter')
const sharp = require('sharp')

const blogDir = path.resolve(process.cwd(), 'src/content/blog')

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.avif']
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true })
}

function isMarkdownFile(file) {
    return file.endsWith('.md') || file.endsWith('.mdx')
}

function isImageFile(file) {
    return IMAGE_EXTS.includes(path.extname(file).toLowerCase())
}

function isElogMarkdown(raw) {
    const parsed = matter(raw)

    return Boolean(
        parsed.data.urlname ||
        parsed.data.catalog ||
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

function moveDirContents(sourceDir, targetDir) {
    if (!fs.existsSync(sourceDir)) return
    if (path.resolve(sourceDir) === path.resolve(targetDir)) return

    ensureDir(targetDir)

    for (const entry of fs.readdirSync(sourceDir)) {
        const sourcePath = path.join(sourceDir, entry)
        const targetPath = path.join(targetDir, entry)

        if (fs.existsSync(targetPath)) {
            if (fs.statSync(sourcePath).isDirectory() && fs.statSync(targetPath).isDirectory()) {
                moveDirContents(sourcePath, targetPath)
                fs.rmSync(sourcePath, { recursive: true, force: true })
                continue
            }

            fs.rmSync(targetPath, { recursive: true, force: true })
        }

        fs.renameSync(sourcePath, targetPath)
    }

    fs.rmSync(sourceDir, { recursive: true, force: true })
}

function rgbToHex({ r, g, b }) {
    const toHex = (n) => Math.round(n).toString(16).padStart(2, '0').toUpperCase()
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

async function getDominantColor(imagePath) {
    const { dominant } = await sharp(imagePath).stats()
    return rgbToHex(dominant)
}

async function downloadImageToWebp(url, targetPath) {
    if (typeof fetch !== 'function') {
        throw new Error('当前 Node 版本不支持 fetch，请升级到 Node 18+')
    }

    const response = await fetch(url)

    if (!response.ok) {
        throw new Error(`下载封面失败：${response.status} ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    await sharp(buffer)
        .resize({
            width: 1800,
            withoutEnlargement: true,
        })
        .webp({ quality: 86 })
        .toFile(targetPath)
}

async function convertImageToWebp(sourcePath, targetPath) {
    await sharp(sourcePath)
        .resize({
            width: 1800,
            withoutEnlargement: true,
        })
        .webp({ quality: 86 })
        .toFile(targetPath)
}

function findFirstImageInDir(dir) {
    if (!fs.existsSync(dir)) return null

    const files = fs.readdirSync(dir)

    // 优先找 cover.xxx
    const cover = files.find((file) => {
        const lower = file.toLowerCase()
        return lower.startsWith('cover.') && isImageFile(lower)
    })

    if (cover) {
        return path.join(dir, cover)
    }

    const firstImage = files.find((file) => isImageFile(file))

    return firstImage ? path.join(dir, firstImage) : null
}

function resolveLocalCoverPath(articleDir, coverValue) {
    if (!coverValue || typeof coverValue !== 'string') return null
    if (/^https?:\/\//.test(coverValue)) return null

    const normalized = coverValue
        .replace(/^\.\//, '')
        .replace(/^\/+/, '')

    const possiblePaths = [
        path.join(articleDir, normalized),
        path.join(articleDir, 'img', normalized),
    ]

    return possiblePaths.find((filePath) => fs.existsSync(filePath)) || null
}

async function ensureCoverWebp(articleDir, frontmatter) {
    const coverPath = path.join(articleDir, 'cover.webp')

    if (fs.existsSync(coverPath)) {
        return coverPath
    }

    const coverValue = frontmatter.cover

    // 1. 优先使用 Elog / Notion 生成的 cover 字段
    if (typeof coverValue === 'string' && /^https?:\/\//.test(coverValue)) {
        try {
            await downloadImageToWebp(coverValue, coverPath)
            return coverPath
        } catch (error) {
            console.warn(`[cover] Notion cover 下载失败，将尝试使用文章图片：${error.message}`)
        }
    }

    // 2. 如果 cover 是本地路径，尝试转换为 cover.webp
    const localCover = resolveLocalCoverPath(articleDir, coverValue)
    if (localCover) {
        await convertImageToWebp(localCover, coverPath)
        return coverPath
    }

    // 3. 兜底：使用 img 目录下第一张图片作为封面
    const firstImage = findFirstImageInDir(path.join(articleDir, 'img'))
    if (firstImage) {
        await convertImageToWebp(firstImage, coverPath)
        return coverPath
    }

    return null
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

    const description = frontmatter.description || frontmatter.summary || ''
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

function fixImagePaths(content, title) {
    const oldPrefix1 = `./${title}/img/`
    const oldPrefix2 = `${title}/img/`
    const encodedTitle = encodeURI(title)
    const oldPrefix3 = `./${encodedTitle}/img/`
    const oldPrefix4 = `${encodedTitle}/img/`

    return content
        .split(oldPrefix1).join('./img/')
        .split(oldPrefix2).join('./img/')
        .split(oldPrefix3).join('./img/')
        .split(oldPrefix4).join('./img/')
}

async function rewriteArticle(articleDir, indexFile) {
    const raw = fs.readFileSync(indexFile, 'utf8')
    const parsed = matter(raw)

    const articleTitle = parsed.data.title || path.basename(articleDir)
    const fixedContent = fixImagePaths(parsed.content.trimStart(), articleTitle)

    const coverPath = await ensureCoverWebp(articleDir, parsed.data)
    const heroColor = coverPath ? await getDominantColor(coverPath) : null

    const nextFrontmatter = buildFrontmatter(parsed.data, articleTitle, heroColor)
    const nextContent = `${nextFrontmatter}${fixedContent}`

    fs.writeFileSync(indexFile, nextContent, 'utf8')

    console.log(`rewritten: ${path.relative(process.cwd(), indexFile)}`)
}

async function moveRootMarkdownFile(fileName) {
    const sourcePath = path.join(blogDir, fileName)

    if (!fs.statSync(sourcePath).isFile()) return
    if (!isMarkdownFile(fileName)) return

    const raw = fs.readFileSync(sourcePath, 'utf8')
    if (!isElogMarkdown(raw)) return

    const ext = path.extname(fileName)
    const parsed = matter(raw)
    const title = parsed.data.title || path.basename(fileName, ext)
    const slug = getArticleSlug(parsed.data, title)

    const titleImageDir = path.join(blogDir, title)
    const articleDir = path.join(blogDir, slug)
    const targetPath = path.join(articleDir, `index${ext}`)

    ensureDir(articleDir)
    moveDirContents(titleImageDir, articleDir)

    let content = raw
    content = fixImagePaths(content, title)

    fs.writeFileSync(targetPath, content, 'utf8')
    fs.unlinkSync(sourcePath)

    console.log(`moved: ${fileName} -> ${slug}/index${ext}`)

    await rewriteArticle(articleDir, targetPath)
}

async function processExistingArticleDir(entryName) {
    const articleDir = path.join(blogDir, entryName)

    if (!fs.statSync(articleDir).isDirectory()) return

    const indexMd = path.join(articleDir, 'index.md')
    const indexMdx = path.join(articleDir, 'index.mdx')

    if (fs.existsSync(indexMd)) {
        await rewriteArticle(articleDir, indexMd)
    } else if (fs.existsSync(indexMdx)) {
        await rewriteArticle(articleDir, indexMdx)
    }
}

async function main() {
    if (!fs.existsSync(blogDir)) {
        console.error(`blogDir not found: ${blogDir}`)
        process.exit(1)
    }

    const entries = fs.readdirSync(blogDir)

    // 先处理 Elog 新生成在 blog 根目录下的 md/mdx 文件
    for (const entry of entries) {
        const fullPath = path.join(blogDir, entry)

        if (fs.statSync(fullPath).isFile() && isMarkdownFile(entry)) {
            await moveRootMarkdownFile(entry)
        }
    }

    if (!process.argv.includes('--rewrite-existing')) return

    const latestEntries = fs.readdirSync(blogDir)
    for (const entry of latestEntries) {
        const fullPath = path.join(blogDir, entry)

        if (fs.statSync(fullPath).isDirectory()) {
            await processExistingArticleDir(entry)
        }
    }
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
